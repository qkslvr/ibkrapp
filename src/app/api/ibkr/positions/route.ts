import { NextResponse } from "next/server";
import { ibkrClient } from "@/lib/ibkr/client";
import { transformPositions } from "@/lib/ibkr/transform";
import { getQuote, getCompanyProfile, FinnhubQuote, FinnhubProfile } from "@/lib/finnhub/client";
import { readCache, writeCache } from "@/lib/cache";
import { mockPositions } from "@/lib/mock-data";
import { IBKRPosition, Position } from "@/types";

const CACHE_KEY = "positions";

function extractSymbol(contractDesc: string): string {
  const parenMatch = contractDesc.match(/\(([A-Z]{1,5})\)/);
  if (parenMatch) return parenMatch[1];
  const firstWord = contractDesc.split(/\s/)[0];
  if (/^[A-Z]{1,5}$/.test(firstWord)) return firstWord;
  return contractDesc.slice(0, 5).trim();
}

export async function GET() {
  const rawPositions: IBKRPosition[] = await ibkrClient.getPositions();

  if (rawPositions.length) {
    const symbols = rawPositions.map((p) => extractSymbol(p.contractDesc));
    const totalPortfolioValue = rawPositions.reduce((sum, p) => sum + p.mktValue, 0);

    const [quotesArr, profilesArr] = await Promise.all([
      Promise.all(symbols.map((s) => getQuote(s))),
      Promise.all(symbols.map((s) => getCompanyProfile(s))),
    ]);

    const quotes = new Map<string, FinnhubQuote | null>(
      symbols.map((s, i) => [s, quotesArr[i]])
    );
    const profiles = new Map<string, FinnhubProfile | null>(
      symbols.map((s, i) => [s, profilesArr[i]])
    );

    const positions = transformPositions(rawPositions, quotes, profiles, totalPortfolioValue);
    writeCache(CACHE_KEY, positions);
    return NextResponse.json(positions);
  }

  // Gateway offline — try last real data, then fall back to mock
  const cached = readCache<Position[]>(CACHE_KEY);
  return NextResponse.json(cached ?? mockPositions);
}
