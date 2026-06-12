import { NextResponse } from "next/server";
import { readCache, writeCache, cacheExists } from "@/lib/cache";

const CACHE_KEY = "watchlist";

// Seeded the first time the watchlist is requested, so the page isn't empty on a fresh install.
const DEFAULT_SYMBOLS = ["TSLA", "AMZN", "META", "NFLX", "AMD", "COST"];

function load(): string[] {
  if (!cacheExists(CACHE_KEY)) {
    writeCache(CACHE_KEY, DEFAULT_SYMBOLS);
    return DEFAULT_SYMBOLS;
  }
  return readCache<string[]>(CACHE_KEY) ?? [];
}

function save(symbols: string[]): void {
  writeCache(CACHE_KEY, symbols);
}

function normalize(symbol: unknown): string | null {
  if (typeof symbol !== "string") return null;
  const upper = symbol.trim().toUpperCase();
  return /^[A-Z.]{1,6}$/.test(upper) ? upper : null;
}

export async function GET() {
  return NextResponse.json(load());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const symbol = normalize(body.symbol);
  if (!symbol) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const symbols = load();
  if (!symbols.includes(symbol)) {
    symbols.unshift(symbol);
    save(symbols);
  }
  return NextResponse.json(symbols);
}

export async function DELETE(request: Request) {
  const symbol = normalize(new URL(request.url).searchParams.get("symbol"));
  if (!symbol) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const symbols = load().filter((s) => s !== symbol);
  save(symbols);
  return NextResponse.json(symbols);
}
