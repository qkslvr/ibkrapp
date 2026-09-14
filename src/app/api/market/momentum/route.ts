import { NextResponse } from "next/server";
import { getJob, ensureFresh } from "@/lib/momentum-job";

// Returns the cached ≥$1B momentum scores. Self-heals: if the cache is stale or
// missing (e.g. the nightly run was skipped), it kicks off a background
// recompute and returns whatever's cached in the meantime. The heavy scoring
// normally runs nightly via /api/cron/momentum.
export async function GET() {
  ensureFresh();
  const job = getJob();
  if (!job) {
    return NextResponse.json({ status: "computing", computedAt: Date.now(), total: 0, done: 0, rows: [] });
  }
  return NextResponse.json(job);
}
