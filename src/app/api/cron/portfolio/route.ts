import { NextResponse } from "next/server";
import { getQuotesForTickers } from "@/lib/finviz/client";
import { transformPositions, extractSymbol } from "@/lib/ibkr/transform";
import { readCache, writeCache } from "@/lib/cache";
import { IBKRPosition } from "@/types";

// Nightly refresh of the portfolio holdings' Finviz-sourced data — price,
// market cap, and the analyst consensus target / expected return — so those
// values stay current even when the dashboard isn't being viewed and when the
// IBKR gateway is offline (we reprice the last-known holdings). Protected by the
// shared cron secret.
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = readCache<IBKRPosition[]>("positions_raw");
  if (!raw?.length) {
    return NextResponse.json({ refreshed: 0, reason: "no cached holdings" });
  }

  const symbols = raw.map((p) => extractSymbol(p.contractDesc));
  const total = raw.reduce((s, p) => s + p.mktValue, 0);
  const quotes = await getQuotesForTickers(symbols);
  const positions = transformPositions(raw, quotes, total);
  writeCache("positions", positions);

  const withTarget = positions.filter((p) => p.expectedReturn != null).length;
  return NextResponse.json({ refreshed: positions.length, withTarget });
}
