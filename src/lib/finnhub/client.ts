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
