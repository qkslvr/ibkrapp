import { NextResponse } from "next/server";
import { ibkrClient } from "@/lib/ibkr/client";
import { transformAccountSummary } from "@/lib/ibkr/transform";
import { readCache, writeCache } from "@/lib/cache";
import { mockPortfolioSummary } from "@/lib/mock-data";
import { PortfolioSummary } from "@/types";

const CACHE_KEY = "account";

export async function GET() {
  const [summary, positions] = await Promise.all([
    ibkrClient.getAccountSummary(),
    ibkrClient.getPositions(),
  ]);

  if (summary) {
    const data = transformAccountSummary(summary, positions);
    writeCache(CACHE_KEY, data);
    return NextResponse.json(data);
  }

  // Gateway offline — try last real data, then fall back to mock
  const cached = readCache<PortfolioSummary>(CACHE_KEY);
  return NextResponse.json(cached ?? mockPortfolioSummary);
}
