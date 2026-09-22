// Nightly build of the screener index. Everything the screens read is assembled
// here — live price / market cap / P-E / margin / sector from Finviz, quarterly
// revenue-profit-PE history from Finnhub, and rolling price lows/high from the
// daily price-history store. Screens are cheap pure filters over this index at
// request time (see lib/screens.ts).
//
// Incremental: the cached index is the base. Live fields (price, mcap, P/E, the
// rolling lows/high) are refreshed every run from the single Finviz call + the
// price-history store — cheap. The expensive Finnhub fundamentals are only
// re-pulled for a stock once its known earnings date has passed since we last
// pulled it (or it's new / gone stale), so a typical night hits Finnhub for a
// few hundred names instead of all ~2,650.
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
  fetched?: number; // how many names were re-pulled from Finnhub this run
  stocks: ScreenStock[];
}

const CACHE_KEY = "screener_index";
const MIN_CAP = 1e9;
const PACE_MS = 2000; // ≥2s between Finnhub calls → ~30/min, no rate-limit risk
const STALE_MS = 30 * 60 * 60 * 1000; // 30h — a nightly run keeps it fresh
const PERSIST_EVERY = 50;
const DAY = 24 * 60 * 60 * 1000;
const UNKNOWN_EARNINGS_MAX_AGE = 40 * DAY; // refresh at least ~monthly if we can't read an earnings date
const HARD_MAX_AGE = 100 * DAY; // never let fundamentals get older than this

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

/** Finviz reports the most-recent earnings datetime, e.g. "7/30/2026 4:30:00 PM"
 *  (V8's Date.parse handles that US format directly). Returns ms, or NaN. */
function parseEarnings(raw: string | null): number {
  return raw ? Date.parse(raw) : NaN;
}

/** Should we re-pull this stock's Finnhub fundamentals tonight? We do when it has
 *  reported earnings since we last pulled it — i.e. Finviz's most-recent earnings
 *  date is in the past and later than our last fetch. (A future/next-scheduled
 *  date means no new report yet → reuse.) */
function needsRefetch(prev: ScreenStock | undefined, earnRaw: string | null, now: number): boolean {
  if (!prev) return true; // new to the universe
  const fetchedAt = prev.fetchedAt ?? 0;
  if (now - fetchedAt > HARD_MAX_AGE) return true;
  const e = parseEarnings(earnRaw);
  if (Number.isNaN(e)) return now - fetchedAt > UNKNOWN_EARNINGS_MAX_AGE;
  return e <= now && e > fetchedAt; // a report landed after our last pull
}

/** Run a full index build (incremental). No-op if one is already running. */
export async function runScreenerIndex(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const universe = await screenByMarketCap(MIN_CAP);

    // Record today's close for every name, then read back the rolling lows/high.
    appendDailyPrices(universe.map((u) => ({ symbol: u.ticker, price: u.price })));
    const stats = allPriceStats();

    const prev = new Map((getIndex()?.stocks ?? []).map((s) => [s.symbol, s]));
    const now = Date.now();
    const candidates = [...universe].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));

    const job: ScreenerIndex = {
      status: "computing", computedAt: now, total: candidates.length, done: 0, fetched: 0, stocks: [],
    };
    current = job;

    for (const u of candidates) {
      const p = prev.get(u.ticker);
      const refetch = needsRefetch(p, u.earningsDate, now);

      let series = null;
      if (refetch) {
        await sleep(PACE_MS);
        try {
          series = await getScreenerSeries(u.ticker);
        } catch {
          /* keep going */
        }
        job.fetched!++;
      }

      const st = stats.get(u.ticker);
      const fvHigh52w =
        u.price != null && u.high52wPct != null ? u.price / (1 + u.high52wPct / 100) : null;
      const fvLow50 =
        u.price != null && u.low50dPct != null ? u.price / (1 + u.low50dPct / 100) : null;

      // Fundamentals: fresh pull, or carried over from the previous index.
      const rev = refetch ? series?.revenue ?? [] : p?.rev ?? [];
      const profit = refetch ? series?.netProfit ?? [] : p?.profit ?? [];
      const pm = refetch
        ? series?.profitMargin ?? (u.profitMargin != null ? [u.profitMargin] : [])
        : p?.pm ?? [];
      const peSeries = refetch ? series?.pe ?? (u.pe != null ? [u.pe] : []) : p?.peSeries ?? [];

      job.stocks.push({
        symbol: u.ticker,
        company: u.company,
        country: u.country,
        sector: u.sector || null,
        // live fields — always refreshed from tonight's Finviz + price history
        price: u.price,
        marketCap: u.marketCap,
        pe: u.pe,
        low30: st?.low30 ?? null,
        low60: st?.low60 ?? fvLow50,
        high52w: st?.high52w ?? fvHigh52w,
        // carried-or-fresh fundamentals
        rev, profit, pm, peSeries,
        // bookkeeping
        fetchedAt: refetch ? now : p?.fetchedAt ?? now,
        nextEarnings: u.earningsDate || null, // most-recent earnings date seen (for reference)
      });

      job.done++;
      if (job.done % PERSIST_EVERY === 0) writeCache(CACHE_KEY, job);
    }

    job.status = "ready";
    job.computedAt = Date.now();
    writeCache(CACHE_KEY, job);
    console.log(`[screener-index] done: ${job.done} stocks, ${job.fetched} re-pulled from Finnhub`);
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
