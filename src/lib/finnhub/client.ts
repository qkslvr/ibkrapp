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
