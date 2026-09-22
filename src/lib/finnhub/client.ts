const BASE_URL = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY || "";

async function finnhubFetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!API_KEY) return null;
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("token", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export interface FinnhubProfile {
  name: string;
  ticker: string;
  finnhubIndustry: string;
  logo: string;
  country: string;
  exchange: string;
  marketCapitalization: number;
  shareOutstanding: number;
  weburl: string;
  currency: string;
}

export interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface FinnhubCandle {
  c: number[];  // close prices
  h: number[];  // high prices
  l: number[];  // low prices
  o: number[];  // open prices
  s: string;    // status
  t: number[];  // timestamps
  v: number[];  // volume
}

export async function getCompanyProfile(symbol: string): Promise<FinnhubProfile | null> {
  return finnhubFetch<FinnhubProfile>("/stock/profile2", { symbol });
}

export async function getNews(symbol: string): Promise<FinnhubNewsItem[] | null> {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 7);
  return finnhubFetch<FinnhubNewsItem[]>("/company-news", {
    symbol,
    from: from.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
  });
}

export async function getCandleData(
  symbol: string,
  from: number,
  to: number,
  resolution: string = "D"
): Promise<FinnhubCandle | null> {
  return finnhubFetch<FinnhubCandle>("/stock/candle", {
    symbol,
    from: String(from),
    to: String(to),
    resolution,
  });
}

type Point = { period: string; v: number };
interface MetricResponse {
  series?: {
    quarterly?: {
      eps?: Point[];
      pb?: Point[];
      bookValue?: Point[]; // total book equity → pb × bookValue = market cap
      salesPerShare?: Point[];
      netMargin?: Point[]; // fraction (0.27 = 27%)
      psTTM?: Point[];
      peTTM?: Point[];
      pfcfTTM?: Point[];
      fcfPerShareTTM?: Point[];
    };
  };
}

export interface QuarterlySeries {
  eps: number[]; // quarterly EPS, most-recent first
  marketCap: number[]; // quarterly market cap (pb × book equity), most-recent first
}

const toSeries = (pts?: Point[]): number[] =>
  (pts ?? [])
    .filter((p) => typeof p.v === "number")
    .sort((a, b) => b.period.localeCompare(a.period))
    .map((p) => p.v);

/** Quarterly EPS + market-cap history from one metric call. */
export async function getQuarterlySeries(symbol: string): Promise<QuarterlySeries | null> {
  const data = await finnhubFetch<MetricResponse>("/stock/metric", { symbol, metric: "all" });
  const q = data?.series?.quarterly;
  if (!q?.eps?.length) return null;

  // Market cap per quarter = pb × total book equity, aligned by period.
  const pb = new Map((q.pb ?? []).map((p) => [p.period, p.v]));
  const bv = new Map((q.bookValue ?? []).map((p) => [p.period, p.v]));
  const marketCap = [...bv.keys()]
    .filter((per) => pb.has(per) && typeof pb.get(per) === "number" && typeof bv.get(per) === "number")
    .sort((a, b) => b.localeCompare(a))
    .map((per) => (pb.get(per) as number) * (bv.get(per) as number));

  return { eps: toSeries(q.eps), marketCap };
}

// ── Quarterly history for the multi-screen screener ───────────────────────────
// Finnhub's metric series is per-share / ratios only, so we can't read absolute
// revenue/profit off a single quarter — and deriving it (revenue = salesPerShare
// × shares) is fragile: a bad salesPerShare point or a stock split corrupts the
// implied share count and blows the growth ratio up (e.g. BMY showing 23×).
//
// Instead we use two split-invariant identities that give trailing-12-month
// magnitudes directly, at each quarter-end:
//   revenueTTM[q]   = marketCap[q] / psTTM[q]
//   netProfitTTM[q] = marketCap[q] / peTTM[q]   (only where peTTM > 0)
//   marketCap[q]    = pb[q] × bookValue[q]
// psTTM and peTTM are price/…-per-share ratios, so a split cancels top and
// bottom — the result tracks the actual reported figures ($48B for BMY, etc.).
// Growth screens therefore compare TTM now vs TTM N quarters ago.
// All arrays are most-recent-first, index-aligned, up to `MAX_Q` quarters.
const MAX_Q = 12;

export interface ScreenerSeries {
  periods: string[];      // quarter-end dates, most-recent-first
  revenue: (number | null)[];      // trailing-12-month revenue, $ (split-proof)
  netProfit: (number | null)[];    // trailing-12-month net profit, $
  profitMargin: (number | null)[]; // %, per quarter
  pe: (number | null)[];           // trailing P/E per quarter
  marketCap: (number | null)[];    // dollars, quarter-end
}

/** Quarterly revenue / net-profit / margin / P-E history from one metric call. */
export async function getScreenerSeries(symbol: string): Promise<ScreenerSeries | null> {
  const data = await finnhubFetch<MetricResponse>("/stock/metric", { symbol, metric: "all" });
  const q = data?.series?.quarterly;
  if (!q) return null;

  const map = (pts?: Point[]) =>
    new Map((pts ?? []).filter((p) => typeof p.v === "number").map((p) => [p.period, p.v]));
  const pb = map(q.pb), bv = map(q.bookValue);
  const nm = map(q.netMargin), psttm = map(q.psTTM), pettm = map(q.peTTM);

  const periods = [...pb.keys()]
    .filter((p) => bv.has(p))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, MAX_Q);
  if (!periods.length) return null;

  const mcap = (p: string) => (pb.get(p) as number) * (bv.get(p) as number) * 1e6;

  return {
    periods,
    revenue: periods.map((p) => {
      const ps = psttm.get(p);
      return ps && ps > 0 ? mcap(p) / ps : null;
    }),
    netProfit: periods.map((p) => {
      const pe = pettm.get(p);
      return pe && pe > 0 ? mcap(p) / pe : null; // only meaningful when profitable
    }),
    profitMargin: periods.map((p) => (nm.has(p) ? (nm.get(p) as number) * 100 : null)),
    pe: periods.map((p) => (pettm.has(p) ? (pettm.get(p) as number) : null)),
    marketCap: periods.map((p) => mcap(p)),
  };
}
