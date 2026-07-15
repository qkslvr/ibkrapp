import { NextResponse } from "next/server";
import { ibkrClient } from "@/lib/ibkr/client";
import { transformPositions } from "@/lib/ibkr/transform";
import { getQuotesForTickers } from "@/lib/finviz/client";
import { readCache, writeCache } from "@/lib/cache";
import { mockPositions } from "@/lib/mock-data";
import { IBKRPosition, Position } from "@/types";

const CACHE_KEY = "positions";
// Raw IBKR holdings (shares/avgCost/symbol) — kept separately from the
// priced Position[] cache so we can reprice from Finviz even when the IBKR
// gateway is offline/logged out and we're serving last-known holdings.
const RAW_CACHE_KEY = "positions_raw";

function extractSymbol(contractDesc: string): string {
  const parenMatch = contractDesc.match(/\(([A-Z]{1,5})\)/);
  if (parenMatch) return parenMatch[1];
  const firstWord = contractDesc.split(/\s/)[0];
  if (/^[A-Z]{1,5}$/.test(firstWord)) return firstWord;
  return contractDesc.slice(0, 5).trim();
}

// Portfolio structure (shares, avg cost) always comes from IBKR; price and
// market cap always come from Finviz — never from IBKR's own mktPrice.
async function priceHoldings(rawPositions: IBKRPosition[]): Promise<Position[]> {
  const symbols = rawPositions.map((p) => extractSymbol(p.contractDesc));
  const totalPortfolioValue = rawPositions.reduce((sum, p) => sum + p.mktValue, 0);
  const quotes = await getQuotesForTickers(symbols);
  return transformPositions(rawPositions, quotes, totalPortfolioValue);
}

export async function GET() {
  const rawPositions: IBKRPosition[] = await ibkrClient.getPositions();

  if (rawPositions.length) {
    const positions = await priceHoldings(rawPositions);
    writeCache(CACHE_KEY, positions);
    writeCache(RAW_CACHE_KEY, rawPositions);
    return NextResponse.json(positions);
  }

  // IBKR gateway offline/not logged in — reprice the last-known holdings
  // from Finviz so prices/market caps stay live even without a fresh
  // portfolio fetch.
  const cachedRaw = readCache<IBKRPosition[]>(RAW_CACHE_KEY);
  if (cachedRaw?.length) {
    const positions = await priceHoldings(cachedRaw);
    writeCache(CACHE_KEY, positions);
    return NextResponse.json(positions);
  }

  // No raw holdings cached yet either — fall back to the last priced
  // snapshot, then mock data.
  const cached = readCache<Position[]>(CACHE_KEY);
  return NextResponse.json(cached ?? mockPositions);
}
