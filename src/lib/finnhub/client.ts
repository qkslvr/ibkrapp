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

export interface FinnhubQuote {
  c: number;  // current price
  d: number;  // change
  dp: number; // change percent
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
  t: number;  // timestamp
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

export interface FinnhubBasicFinancials {
  metric: {
    "52WeekHigh": number;
    "52WeekLow": number;
    peBasicExclExtraTTM: number;
    peNormalizedAnnual: number;
    psTTM: number;
    pbAnnual: number;
    evEbitdaAnnual: number;
    epsBasicExclExtraAnnual: number;
    epsGrowthTTMYoy: number;
    revenueGrowthTTMYoy: number;
    netProfitMarginTTM: number;
    roeTTM: number;
    roaTTM: number;
    totalDebt_totalEquityAnnual: number;
    currentRatioAnnual: number;
    freeCashFlowAnnual: number;
    revenuePerShareAnnual: number;
    "10DayAverageTradingVolume": number;
    "3MonthAverageTradingVolume": number;
    dividendYieldIndicatedAnnual: number;
    dividendsPerShareAnnual: number;
    payoutRatioAnnual: number;
  };
}

export interface FinnhubRecommendation {
  buy: number;
  hold: number;
  sell: number;
  strongBuy: number;
  strongSell: number;
  period: string;
  symbol: string;
}

export interface FinnhubPriceTarget {
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
  lastUpdated: string;
  symbol: string;
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

export interface FinnhubDividend {
  amount: number;
  date: string;
  declarationDate: string;
  exDate: string;
  frequency: string;
  payDate: string;
  recordDate: string;
  symbol: string;
}

export async function getQuote(symbol: string): Promise<FinnhubQuote | null> {
  return finnhubFetch<FinnhubQuote>("/quote", { symbol });
}

export async function getCompanyProfile(symbol: string): Promise<FinnhubProfile | null> {
  return finnhubFetch<FinnhubProfile>("/stock/profile2", { symbol });
}

export async function getBasicFinancials(symbol: string): Promise<FinnhubBasicFinancials | null> {
  return finnhubFetch<FinnhubBasicFinancials>("/stock/metric", {
    symbol,
    metric: "all",
  });
}

export async function getRecommendations(symbol: string): Promise<FinnhubRecommendation[] | null> {
  return finnhubFetch<FinnhubRecommendation[]>("/stock/recommendation", { symbol });
}

export async function getPriceTarget(symbol: string): Promise<FinnhubPriceTarget | null> {
  return finnhubFetch<FinnhubPriceTarget>("/stock/price-target", { symbol });
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

export async function getDividends(
  symbol: string,
  from: string,
  to: string
): Promise<FinnhubDividend[] | null> {
  return finnhubFetch<FinnhubDividend[]>("/stock/dividend", { symbol, from, to });
}
