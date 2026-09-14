// Nightly EPS-momentum scoring for the whole ≥$1B universe.
//
// One shared job in the Node process (PM2), so the page route and the cron
// route see the same state. It scores every stock slowly (sequential, ~30
// Finnhub calls/min) to stay well under the rate limit — a full run takes ~1.5h
// and is meant to run overnight. Results are cached; the page just polls them.
import { readCache, writeCache } from "@/lib/cache";
import { screenByMarketCap } from "@/lib/finviz/client";
import { getQuarterlyEps } from "@/lib/finnhub/client";
import { computeMomentum, MomentumScore } from "@/lib/momentum";

export interface MomentumRow {
  symbol: string;
  company: string;
  country: string | null; // home country (Finviz), so ADRs show their origin
  marketCap: number | null;
  epsGrowthQoQ: number | null;
  m: MomentumScore;
}
export interface MomentumJob {
  status: "computing" | "ready";
  computedAt: number;
  total: number;
  done: number;
  rows: MomentumRow[];
}

const CACHE_KEY = "momentum_all";
const MIN_CAP = 1e9;
const PACE_MS = 2000; // ≥2s between Finnhub calls → ~30/min, no rate-limit risk
const STALE_MS = 30 * 60 * 60 * 1000; // 30h — a nightly run keeps it fresh
const PERSIST_EVERY = 25;

let current: MomentumJob | null = null;
let running = false;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function getJob(): MomentumJob | null {
  if (!current) current = readCache<MomentumJob>(CACHE_KEY);
  return current;
}

export function isRunning(): boolean {
  return running;
}

function sortRows(rows: MomentumRow[]): void {
  rows.sort((a, b) => b.m.score - a.m.score || (b.m.q8 ?? -1) - (a.m.q8 ?? -1));
}

/** Run a full scoring pass. No-op if one is already running. */
export async function runMomentum(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const universe = await screenByMarketCap(MIN_CAP);
    const candidates = [...universe].sort(
      (a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0),
    );

    const job: MomentumJob = {
      status: "computing",
      computedAt: Date.now(),
      total: candidates.length,
      done: 0,
      rows: [],
    };
    current = job;

    for (const c of candidates) {
      await sleep(PACE_MS);
      try {
        const eps = await getQuarterlyEps(c.ticker);
        const m = eps ? computeMomentum(eps) : null;
        if (m) {
          job.rows.push({
            symbol: c.ticker,
            company: c.company,
            country: c.country,
            marketCap: c.marketCap,
            epsGrowthQoQ: c.epsGrowthQoQ,
            m,
          });
        }
      } catch {
        /* skip a stock that fails; keep going */
      }
      job.done++;
      if (job.done % PERSIST_EVERY === 0) {
        sortRows(job.rows);
        writeCache(CACHE_KEY, job);
      }
    }

    sortRows(job.rows);
    job.status = "ready";
    job.computedAt = Date.now();
    writeCache(CACHE_KEY, job);
  } finally {
    running = false;
  }
}

/** Kick off a background recompute if the cache is stale/missing and nothing is
 *  already running. Used by the page route so it self-heals if a nightly run
 *  was ever missed. */
export function ensureFresh(): void {
  const job = getJob();
  const fresh = job && job.status === "ready" && Date.now() - job.computedAt < STALE_MS;
  if (!fresh && !running) {
    runMomentum().catch((e) => console.error("[momentum]", e));
  }
}
