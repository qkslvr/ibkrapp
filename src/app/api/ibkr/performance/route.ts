import { NextResponse } from "next/server";
import { getCurrentPortfolioValue } from "@/lib/ibkr/current-value";
import { getPortfolioHistory, recordSnapshot } from "@/lib/portfolio-history";
import { PerformanceDataPoint } from "@/types";

// Days to look back per timeframe. null = since inception (ALL).
const LOOKBACK_DAYS: Record<string, number | null> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  ALL: null,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "1M";

  // Only a real, live-or-cached-real value gets persisted — never fabricate a day.
  const currentValue = await getCurrentPortfolioValue();
  const history = currentValue > 0 ? recordSnapshot(currentValue) : getPortfolioHistory();

  let cutoff: string | null = null;
  if (period === "YTD") {
    cutoff = `${new Date().getFullYear()}-01-01`;
  } else {
    const days = LOOKBACK_DAYS[period];
    if (days != null) {
      const d = new Date();
      d.setDate(d.getDate() - days);
      cutoff = d.toISOString().slice(0, 10);
    }
  }

  const windowed = cutoff ? history.filter((p) => p.date >= cutoff!) : history;
  const points: PerformanceDataPoint[] = (windowed.length > 0 ? windowed : history.slice(-1)).map(
    (p) => ({ date: p.date, value: Math.round(p.value) })
  );

  return NextResponse.json({ data: points, startValue: points[0]?.value ?? 0 });
}
