import { NextResponse } from "next/server";
import { getBasicFinancials, getDividends } from "@/lib/finnhub/client";
import { StockFundamentals, StockDividend } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  const today = new Date().toISOString().split("T")[0];
  const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 24 * 3600 * 1000)
    .toISOString()
    .split("T")[0];

  const [fin, dividends] = await Promise.all([
    getBasicFinancials(upper),
    getDividends(upper, fiveYearsAgo, today),
  ]);

  if (!fin) {
    return NextResponse.json({ fundamentals: null, dividend: null });
  }

  const m = fin.metric;

  const fundamentals: StockFundamentals = {
    peRatio: m.peBasicExclExtraTTM ?? 0,
    forwardPE: m.peNormalizedAnnual ?? 0,
    psRatio: m.psTTM ?? 0,
    pbRatio: m.pbAnnual ?? 0,
    evEbitda: m.evEbitdaAnnual ?? 0,
    pegRatio: 0, // not directly available in basic financials
    eps: m.epsBasicExclExtraAnnual ?? 0,
    epsGrowth: m.epsGrowthTTMYoy ?? 0,
    revenue: 0, // not directly in metric; would need financial statements
    revenueGrowth: m.revenueGrowthTTMYoy ?? 0,
    netIncome: 0,
    profitMargin: m.netProfitMarginTTM ?? 0,
    roe: m.roeTTM ?? 0,
    roa: m.roaTTM ?? 0,
    debtEquity: m.totalDebt_totalEquityAnnual ?? 0,
    currentRatio: m.currentRatioAnnual ?? 0,
    freeCashFlow: m.freeCashFlowAnnual ?? 0,
  };

  // Calculate 5-year dividend growth rate
  let growthRate5Y = 0;
  if (dividends && dividends.length >= 2) {
    const sorted = [...dividends].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const first = sorted[0].amount;
    const last = sorted[sorted.length - 1].amount;
    const years = Math.max(
      (new Date(sorted[sorted.length - 1].date).getTime() -
        new Date(sorted[0].date).getTime()) /
        (365 * 24 * 3600 * 1000),
      1
    );
    growthRate5Y = first > 0 ? ((last / first) ** (1 / years) - 1) * 100 : 0;
  }

  const latestDividend = dividends?.[dividends.length - 1];
  const dividend: StockDividend = {
    yield: m.dividendYieldIndicatedAnnual ?? 0,
    annualDividend: m.dividendsPerShareAnnual ?? 0,
    payoutRatio: m.payoutRatioAnnual ?? 0,
    exDate: latestDividend?.exDate,
    payDate: latestDividend?.payDate,
    growthRate5Y,
  };

  return NextResponse.json({ fundamentals, dividend });
}
