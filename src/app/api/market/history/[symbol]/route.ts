import { NextResponse } from "next/server";
import { getCandleData } from "@/lib/finnhub/client";
import { PerformanceDataPoint } from "@/types";

const RESOLUTION_MAP: Record<string, string> = {
  "1D": "5",
  "1W": "60",
  "1M": "D",
  "3M": "D",
  "6M": "D",
  "YTD": "D",
  "1Y": "W",
  "ALL": "M",
};

const DAYS_MAP: Record<string, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "YTD": 365, // approximate
  "1Y": 365,
  "ALL": 365 * 5,
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get("timeframe") ?? "1M";

  const upper = symbol.toUpperCase();
  const resolution = RESOLUTION_MAP[timeframe] ?? "D";
  const days = DAYS_MAP[timeframe] ?? 30;

  const to = Math.floor(Date.now() / 1000);
  let from = to - days * 24 * 3600;

  // For YTD, start from Jan 1 of current year
  if (timeframe === "YTD") {
    const ytdStart = new Date(new Date().getFullYear(), 0, 1);
    from = Math.floor(ytdStart.getTime() / 1000);
  }

  const candles = await getCandleData(upper, from, to, resolution);

  if (!candles || candles.s !== "ok" || !candles.t?.length) {
    return NextResponse.json([]);
  }

  const data: PerformanceDataPoint[] = candles.t.map((timestamp, i) => ({
    date: new Date(timestamp * 1000).toISOString().split("T")[0],
    value: candles.c[i],
  }));

  return NextResponse.json(data);
}
