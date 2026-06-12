import { NextResponse } from "next/server";
import { getNews } from "@/lib/finnhub/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const news = await getNews(symbol.toUpperCase());
  // Limit to 10 most recent articles
  return NextResponse.json(news?.slice(0, 10) ?? []);
}
