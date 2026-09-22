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

// ── Rich quarterly history for the multi-screen screener ──────────────────────
// Finnhub's metric series is per-share / ratios only, so absolute revenue and
// net profit are derived the same way we validated for the S&P-500 export:
//   price[q]  = psTTM × trailing-4Q salesPerShare  (fallbacks: peTTM, pfcfTTM)
//   shares[q] = marketCap[q] / price[q]             (median-filled for gaps)
//   revenue[q]    = salesPerShare[q] × shares[q]
//   netProfit[q]  = eps[q]          × shares[q]
// All arrays are most-recent-first, index-aligned, up to `MAX_Q` quarters.
const MAX_Q = 12;

export interface ScreenerSeries {
  periods: string[];      // quarter-end dates, most-recent-first
  revenue: (number | null)[];
  netProfit: (number | null)[];
  profitMargin: (number | null)[]; // %, per quarter
  pe: (number | null)[];           // trailing P/E per quarter
  marketCap: (number | null)[];    // dollars, quarter-end
}

const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Quarterly revenue / net-profit / margin / P-E history from one metric call. */
export async function getScreenerSeries(symbol: string): Promise<ScreenerSeries | null> {
  const data = await finnhubFetch<MetricResponse>("/stock/metric", { symbol, metric: "all" });
  const q = data?.series?.quarterly;
  if (!q?.eps?.length) return null;

  const map = (pts?: Point[]) =>
    new Map((pts ?? []).filter((p) => typeof p.v === "number").map((p) => [p.period, p.v]));
  const eps = map(q.eps), sps = map(q.salesPerShare), pb = map(q.pb), bv = map(q.bookValue);
  const nm = map(q.netMargin), psttm = map(q.psTTM), pettm = map(q.peTTM);
  const pfcf = map(q.pfcfTTM), fcfps = map(q.fcfPerShareTTM);

  const periods = [...eps.keys()]
    .filter((p) => pb.has(p) && bv.has(p))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, MAX_Q);
  if (!periods.length) return null;

  // trailing-4-quarter sum of a per-share series, as of period p
  const ttm = (m: Map<string, number>, p: string): number | null => {
    const idx = periods.indexOf(p);
    const win = periods.slice(idx, idx + 4);
    if (win.length < 4 || win.some((x) => !m.has(x))) return null;
    return win.reduce((s, x) => s + (m.get(x) as number), 0);
  };

  // salesPerShare outlier guard (Finnhub occasionally emits a bad quarter)
  const spsVals = periods.map((p) => sps.get(p)).filter((v): v is number => v != null && v > 0);
  const medSps = median(spsVals);
  const cleanSps = (p: string): number | null => {
    const v = sps.get(p);
    if (v == null) return medSps;
    if (medSps && (v > 2.5 * medSps || v < 0.4 * medSps)) return medSps;
    return v;
  };

  const recs = periods.map((p) => {
    const mcap = (pb.get(p) as number) * (bv.get(p) as number) * 1e6;
    let price: number | null = null;
    const st = ttm(sps, p);
    if (psttm.get(p) && st) price = (psttm.get(p) as number) * st;
    if (price == null && pettm.get(p)) {
      const et = ttm(eps, p);
      if (et && et > 0) price = (pettm.get(p) as number) * et;
    }
    if (price == null && pfcf.get(p)) {
      const ft = ttm(fcfps, p);
      if (ft && ft > 0) price = (pfcf.get(p) as number) * ft;
    }
    const shares = price ? mcap / price : null;
    return { p, mcap, shares };
  });
  const medShares = median(recs.map((r) => r.shares).filter((s): s is number => s != null));

  return {
    periods,
    revenue: recs.map((r) => {
      const sh = r.shares ?? medShares;
      const s = cleanSps(r.p);
      return sh != null && s != null ? s * sh : null;
    }),
    netProfit: recs.map((r) => {
      const sh = r.shares ?? medShares;
      const e = eps.get(r.p);
      return sh != null && e != null ? e * sh : null;
    }),
    profitMargin: periods.map((p) => (nm.has(p) ? (nm.get(p) as number) * 100 : null)),
    pe: periods.map((p) => (pettm.has(p) ? (pettm.get(p) as number) : null)),
    marketCap: recs.map((r) => r.mcap),
  };
}
