// Nightly build of the screener index: one slow, rate-limit-safe pass over the
// whole ≥$1B universe that assembles everything the screens read — live price /
// market cap / P-E / margin from Finviz, quarterly revenue-profit-PE history from
// Finnhub, and rolling price lows/high from the daily price-history store. The
// screens themselves are cheap pure filters applied to this index at request
// time (see lib/screens.ts).
import { readCache, writeCache } from "@/lib/cache";
import { screenByMarketCap } from "@/lib/finviz/client";
import { getScreenerSeries } from "@/lib/finnhub/client";
import { appendDailyPrices, allPriceStats } from "@/lib/price-history";
import type { ScreenStock } from "@/lib/screens";

export interface ScreenerIndex {
  status: "computing" | "ready";
  computedAt: number;
  total: number;
  done: number;
  stocks: ScreenStock[];
}

const CACHE_KEY = "screener_index";
const MIN_CAP = 1e9;
const PACE_MS = 2000; // ≥2s between Finnhub calls → ~30/min, no rate-limit risk
const STALE_MS = 30 * 60 * 60 * 1000; // 30h — a nightly run keeps it fresh
const PERSIST_EVERY = 25;

let current: ScreenerIndex | null = null;
let running = false;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function getIndex(): ScreenerIndex | null {
  if (!current) current = readCache<ScreenerIndex>(CACHE_KEY);
  return current;
}
export function isRunning(): boolean {
  return running;
}

/** Run a full index build. No-op if one is already running. */
export async function runScreenerIndex(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const universe = await screenByMarketCap(MIN_CAP);

    // Record today's close for every name, then read back the rolling lows/high.
    appendDailyPrices(universe.map((u) => ({ symbol: u.ticker, price: u.price })));
    const stats = allPriceStats();

    const candidates = [...universe].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
    const job: ScreenerIndex = {
      status: "computing",
      computedAt: Date.now(),
      total: candidates.length,
      done: 0,
      stocks: [],
    };
    current = job;

    for (const u of candidates) {
      await sleep(PACE_MS);
      let series = null;
      try {
        series = await getScreenerSeries(u.ticker);
      } catch {
        /* keep going */
      }

      const st = stats.get(u.ticker);
      // Finviz-distance fallbacks when we don't yet have accumulated history.
      const fvHigh52w =
        u.price != null && u.high52wPct != null ? u.price / (1 + u.high52wPct / 100) : null;
      const fvLow50 =
        u.price != null && u.low50dPct != null ? u.price / (1 + u.low50dPct / 100) : null;

      job.stocks.push({
        symbol: u.ticker,
        company: u.company,
        country: u.country,
        price: u.price,
        marketCap: u.marketCap,
        pe: u.pe,
        rev: series?.revenue ?? [],
        profit: series?.netProfit ?? [],
        pm: series?.profitMargin ?? (u.profitMargin != null ? [u.profitMargin] : []),
        peSeries: series?.pe ?? (u.pe != null ? [u.pe] : []),
        low30: st?.low30 ?? null,
        low60: st?.low60 ?? fvLow50, // 50-day low as a ~60-day proxy until history fills in
        high52w: st?.high52w ?? fvHigh52w,
      });

      job.done++;
      if (job.done % PERSIST_EVERY === 0) writeCache(CACHE_KEY, job);
    }

    job.status = "ready";
    job.computedAt = Date.now();
    writeCache(CACHE_KEY, job);
  } finally {
    running = false;
  }
}

/** Kick a background rebuild if the index is stale/missing and idle. */
export function ensureFresh(): void {
  const job = getIndex();
  const fresh = job && job.status === "ready" && Date.now() - job.computedAt < STALE_MS;
  if (!fresh && !running) {
    runScreenerIndex().catch((e) => console.error("[screener-index]", e));
  }
}
