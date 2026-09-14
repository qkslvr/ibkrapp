import { NextResponse } from "next/server";
import { runMomentum, isRunning } from "@/lib/momentum-job";

// Triggered by the server's nightly cron (1am Dubai = 21:00 UTC). Protected by a
// shared secret rather than the user session. Kicks off the slow full scoring
// pass in the background and returns immediately.
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (isRunning()) {
    return NextResponse.json({ started: false, reason: "already running" });
  }
  runMomentum().catch((e) => console.error("[momentum cron]", e));
  return NextResponse.json({ started: true });
}
