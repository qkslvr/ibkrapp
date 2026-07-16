import { NextResponse } from "next/server";
import { getStockDetail } from "@/lib/finviz/client";
import { StockQuote } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();

  const detail = await getStockDetail(upper);
  if (!detail) {
    return NextResponse.json(null);
  }

  const changeDollar = detail.prevClose != null ? detail.price - detail.prevClose : 0;

  const result: StockQuote = {
    symbol: upper,
    name: detail.name,
    price: detail.price,
    change: changeDollar,
    changePercent: detail.change,
    open: detail.open ?? detail.price,
    prevClose: detail.prevClose ?? detail.price,
    volume: detail.volume ?? 0,
    avgVolume: detail.avgVolume ?? 0,
    marketCap: detail.marketCap ?? 0,
    high52w: detail.high52w ?? 0,
    low52w: detail.low52w ?? 0,
  };

  return NextResponse.json(result);
}
