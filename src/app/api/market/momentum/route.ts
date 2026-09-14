import { NextResponse } from "next/server";
import { readCache, writeCache } from "@/lib/cache";
import { screenIndex, ScreenerIndex } from "@/lib/finviz/client";
import { getQuarterlyEps } from "@/lib/finnhub/client";
import { computeMomentum, MomentumScore } from "@/lib/momentum";

// Momentum = EPS acceleration. We take a Finviz index, keep only names with
// positive recent EPS growth (the momentum candidates), then score each on TTM
// EPS growth over 2/4/6/8 quarters via Finnhub. Scoring is rate-limited
// (~55 calls/min, Finnhub free tier) and cached 24h, computed in the background
// so the page can poll for progress rather than block.

export interface MomentumRow {
  symbol: string;
  company: string;
  marketCap: number | null;
  epsGrowthQoQ: number | null;
  m: MomentumScore;
}
export interface MomentumJob {
  index: string;
  status: "computing" | "ready";
  computedAt: number;
  total: number;
  done: number;
  rows: MomentumRow[];
}

const VALID: ScreenerIndex[] = ["sp500", "ndx", "dji", "all"];
const FRESH_MS = 24 * 60 * 60 * 1000;
const MAX_CANDIDATES = 150;
const SLOT_MS = 1050; // ≥ this gap between Finnhub call starts (≈57/min)
const CONCURRENCY = 6;

const jobs = new Map<string, MomentumJob>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Global call spacer so concurrent workers still respect the rate limit.
let nextSlot = 0;
async function rateSlot() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + SLOT_MS;
  if (wait) await sleep(wait);
}

async function runJob(index: ScreenerIndex) {
  const universe = await screenIndex(index);
  const candidates = universe
    .filter((s) => (s.epsGrowthQoQ ?? -Infinity) > 0) // positive recent EPS growth
    .sort((a, b) => (b.marketCap ?? -1) - (a.marketCap ?? -1))
    .slice(0, MAX_CANDIDATES);

  const job: MomentumJob = {
    index,
    status: "computing",
    computedAt: Date.now(),
    total: candidates.length,
    done: 0,
    rows: [],
  };
  jobs.set(index, job);

  let i = 0;
  const worker = async () => {
    while (i < candidates.length) {
      const c = candidates[i++];
      await rateSlot();
      try {
        const eps = await getQuarterlyEps(c.ticker);
        const m = eps ? computeMomentum(eps) : null;
        if (m) {
          job.rows.push({
            symbol: c.ticker,
            company: c.company,
            marketCap: c.marketCap,
            epsGrowthQoQ: c.epsGrowthQoQ,
            m,
          });
        }
      } catch {
        /* skip a stock that fails */
      }
      job.done++;
      if (job.done % 12 === 0) writeCache(`momentum_${index}`, job); // periodic persist
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  job.rows.sort((a, b) => b.m.score - a.m.score || (b.m.q8 ?? -1) - (a.m.q8 ?? -1));
  job.status = "ready";
  job.computedAt = Date.now();
  jobs.set(index, job);
  writeCache(`momentum_${index}`, job);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get("index") || "sp500") as ScreenerIndex;
  const index = VALID.includes(raw) ? raw : "sp500";

  // Only an in-memory job is actively computing in THIS process. A cached
  // "computing" job means a prior process died mid-run → treat as stale.
  const memJob = jobs.get(index);
  if (memJob && memJob.status === "computing") {
    return NextResponse.json(memJob);
  }

  const cached = readCache<MomentumJob>(`momentum_${index}`) ?? memJob ?? null;
  if (cached && cached.status === "ready" && Date.now() - cached.computedAt < FRESH_MS) {
    jobs.set(index, cached);
    return NextResponse.json(cached);
  }

  // Missing, stale, or a dead 'computing' cache → recompute in the background,
  // returning any prior rows to show while it refreshes.
  const shell: MomentumJob = {
    index,
    status: "computing",
    computedAt: Date.now(),
    total: cached?.total ?? 0,
    done: 0,
    rows: cached?.rows ?? [],
  };
  jobs.set(index, shell);
  runJob(index).catch((e) => console.error("[momentum]", e));
  return NextResponse.json(shell);
}
