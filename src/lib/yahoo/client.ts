import axios from "axios";

const yahoo = axios.create({
  baseURL: "https://query1.finance.yahoo.com",
  timeout: 10000,
  headers: { "User-Agent": "Mozilla/5.0" },
});

export interface YahooCandles {
  timestamps: number[];
  closes: number[];
}

export async function getCandles(symbol: string, range: string): Promise<YahooCandles> {
  const res = await yahoo.get(`/v8/finance/chart/${symbol}`, {
    params: { interval: "1d", range },
  });
  const result = res.data?.chart?.result?.[0];
  return {
    timestamps: result?.timestamp ?? [],
    closes: result?.indicators?.quote?.[0]?.close ?? [],
  };
}

export async function getCandlesSince(symbol: string, fromDate: Date): Promise<YahooCandles> {
  const period1 = Math.floor(fromDate.getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const res = await yahoo.get(`/v8/finance/chart/${symbol}`, {
    params: { interval: "1d", period1, period2 },
  });
  const result = res.data?.chart?.result?.[0];
  return {
    timestamps: result?.timestamp ?? [],
    closes: result?.indicators?.quote?.[0]?.close ?? [],
  };
}

export function periodReturn(closes: number[]): number {
  const valid = closes.filter(Boolean);
  if (valid.length < 2) return 0;
  return (valid[valid.length - 1] - valid[0]) / valid[0];
}

export function dailyReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] && closes[i - 1]) {
      out.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
  }
  return out;
}

export function computeBetaAlpha(
  assetDailyReturns: number[],
  benchmarkDailyReturns: number[],
  riskFreeAnnual = 0.043
): { beta: number; alpha: number } {
  const n = Math.min(assetDailyReturns.length, benchmarkDailyReturns.length);
  if (n < 10) return { beta: 1, alpha: 0 };

  const ar = assetDailyReturns.slice(-n);
  const br = benchmarkDailyReturns.slice(-n);
  const rf = riskFreeAnnual / 252;

  const meanA = ar.reduce((s, r) => s + r, 0) / n;
  const meanB = br.reduce((s, r) => s + r, 0) / n;
  const cov = ar.reduce((s, r, i) => s + (r - meanA) * (br[i] - meanB), 0) / n;
  const varB = br.reduce((s, r) => s + Math.pow(r - meanB, 2), 0) / n;
  const beta = varB > 0 ? cov / varB : 1;

  // Jensen's alpha annualised
  const alpha = ((meanA - rf) * 252 - beta * (meanB - rf) * 252) * 100;

  return { beta: +beta.toFixed(3), alpha: +alpha.toFixed(2) };
}
