import { NextResponse } from "next/server";
import { screenIndex, ScreenerIndex } from "@/lib/finviz/client";

const VALID: ScreenerIndex[] = ["sp500", "ndx", "dji", "all"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get("index") || "sp500") as ScreenerIndex;
  const index = VALID.includes(raw) ? raw : "sp500";

  const stocks = await screenIndex(index);
  return NextResponse.json({ stocks });
}
