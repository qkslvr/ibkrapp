import { NextResponse } from "next/server";
import { getIndex } from "@/lib/screener-index-job";
import { runScreenerAlert } from "@/lib/screener-alerts";

// Telegram digest of names that are NEW to any screen. Normally fired by the
// index build itself; this route is the manual trigger / safety net.
//   ?dry=1   build the message without sending (and without recording)
//   ?force=1 ignore the once-per-day guard
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!process.env.CRON_SECRET || url.searchParams.get("key") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = url.searchParams.get("dry") === "1";
  const force = url.searchParams.get("force") === "1";
  const result = await runScreenerAlert(getIndex(), { dry, force });
  return NextResponse.json(result);
}
