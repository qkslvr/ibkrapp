import { NextResponse } from "next/server";
import { runScreenerIndex, isRunning } from "@/lib/screener-index-job";

// Nightly cron (1am Dubai). Protected by CRON_SECRET. Kicks off the slow full
// index build in the background and returns immediately.
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (isRunning()) {
    return NextResponse.json({ started: false, reason: "already running" });
  }
  runScreenerIndex().catch((e) => console.error("[screener cron]", e));
  return NextResponse.json({ started: true });
}
