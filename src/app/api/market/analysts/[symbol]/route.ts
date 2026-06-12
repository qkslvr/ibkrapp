import { NextResponse } from "next/server";
import { getRecommendations, getPriceTarget } from "@/lib/finnhub/client";
import { AnalystRating } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  const [recommendations, target] = await Promise.all([
    getRecommendations(upper),
    getPriceTarget(upper),
  ]);

  if (!recommendations?.length && !target) {
    return NextResponse.json(null);
  }

  // Use the most recent recommendation period
  const latest = recommendations?.[0];

  const result: AnalystRating = {
    buy: (latest?.buy ?? 0) + (latest?.strongBuy ?? 0),
    hold: latest?.hold ?? 0,
    sell: (latest?.sell ?? 0) + (latest?.strongSell ?? 0),
    targetLow: target?.targetLow ?? 0,
    targetMean: target?.targetMean ?? 0,
    targetHigh: target?.targetHigh ?? 0,
  };

  return NextResponse.json(result);
}
