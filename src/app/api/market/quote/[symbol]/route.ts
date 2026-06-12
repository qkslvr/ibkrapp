import { NextResponse } from "next/server";
import { getQuote, getCompanyProfile, getBasicFinancials } from "@/lib/finnhub/client";
import { StockQuote } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  const [quote, profile, financials] = await Promise.all([
    getQuote(upper),
    getCompanyProfile(upper),
    getBasicFinancials(upper),
  ]);

  if (!quote) {
    return NextResponse.json(null);
  }

  const result: StockQuote = {
    symbol: upper,
    name: profile?.name ?? upper,
    price: quote.c,
    change: quote.d,
    changePercent: quote.dp,
    high: quote.h,
    low: quote.l,
    open: quote.o,
    prevClose: quote.pc,
    volume: 0, // not in basic quote; pulled below
    avgVolume: financials?.metric["3MonthAverageTradingVolume"]
      ? financials.metric["3MonthAverageTradingVolume"] * 1_000_000
      : 0,
    marketCap: profile
      ? profile.marketCapitalization * 1_000_000
      : 0,
    high52w: financials?.metric["52WeekHigh"] ?? 0,
    low52w: financials?.metric["52WeekLow"] ?? 0,
  };

  return NextResponse.json(result);
}
