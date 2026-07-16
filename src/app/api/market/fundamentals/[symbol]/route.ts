import { NextResponse } from "next/server";
import { getStockDetail } from "@/lib/finviz/client";
import { StockFundamentals, StockDividend } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  const detail = await getStockDetail(upper);
  if (!detail) {
    return NextResponse.json({ fundamentals: null, dividend: null });
  }

  const fundamentals: StockFundamentals = {
    peRatio: detail.peRatio ?? 0,
    forwardPE: detail.forwardPE ?? 0,
    psRatio: detail.psRatio ?? 0,
    pbRatio: detail.pbRatio ?? 0,
    evEbitda: 0, // not exposed by Finviz's export
    pegRatio: detail.pegRatio ?? 0,
    eps: detail.eps ?? 0,
    epsGrowth: detail.epsGrowth ?? 0,
    revenue: 0, // not exposed by Finviz's export
    revenueGrowth: detail.revenueGrowth ?? 0,
    netIncome: 0, // not exposed by Finviz's export
    profitMargin: detail.profitMargin ?? 0,
    roe: detail.roe ?? 0,
    roa: detail.roa ?? 0,
    debtEquity: detail.debtEquity ?? 0,
    currentRatio: detail.currentRatio ?? 0,
    freeCashFlow: 0, // not exposed by Finviz's export
  };

  const dividend: StockDividend = {
    yield: detail.dividendYield ?? 0,
    annualDividend:
      detail.dividendYield != null ? detail.price * (detail.dividendYield / 100) : 0,
    payoutRatio: detail.payoutRatio ?? 0,
    growthRate5Y: 0, // not exposed by Finviz's export
  };

  return NextResponse.json({ fundamentals, dividend });
}
