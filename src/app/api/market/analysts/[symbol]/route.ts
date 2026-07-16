import { NextResponse } from "next/server";
import { getStockDetail } from "@/lib/finviz/client";
import { AnalystRating } from "@/types";

function recomLabel(score: number | null): string {
  if (score == null) return "—";
  if (score <= 1.5) return "Strong Buy";
  if (score <= 2.5) return "Buy";
  if (score <= 3.5) return "Hold";
  if (score <= 4.5) return "Sell";
  return "Strong Sell";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  const detail = await getStockDetail(upper);
  if (!detail || (detail.analystRecom == null && detail.targetPrice == null)) {
    return NextResponse.json(null);
  }

  const result: AnalystRating = {
    recom: detail.analystRecom,
    recomLabel: recomLabel(detail.analystRecom),
    targetPrice: detail.targetPrice,
  };

  return NextResponse.json(result);
}
