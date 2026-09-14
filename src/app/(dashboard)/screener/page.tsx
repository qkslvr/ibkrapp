"use client";

import { Card } from "@/components/ui/card";
import { TickerSearch } from "@/components/screener/ticker-search";
import { MomentumTable } from "@/components/screener/momentum-table";
import { useMomentum } from "@/hooks/useMomentum";
import { THRESHOLDS } from "@/lib/momentum";

export default function ScreenerPage() {
  const { data, isLoading, isError } = useMomentum();

  const rows = data?.rows ?? [];
  const computing = data?.status === "computing";
  const pct = data && data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">EPS Momentum Screener</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Every US stock with a market cap over <span className="text-foreground">$1B</span>, scored on
          trailing-12-month EPS growth over <span className="text-foreground">2 / 4 / 6 / 8 quarters</span> against{" "}
          <span className="text-foreground">
            &gt;{THRESHOLDS.q2}% / &gt;{THRESHOLDS.q4}% / &gt;{THRESHOLDS.q6}% / &gt;{THRESHOLDS.q8}%
          </span>
          — one point per threshold met (0–4). Re-scored nightly; sort any column to explore.
        </p>
      </div>

      <TickerSearch />

      {data?.status === "ready" && (
        <p className="text-xs text-muted-foreground">
          Last updated{" "}
          {new Date(data.computedAt).toLocaleString(undefined, {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
          {" · "}auto-refreshes nightly
        </p>
      )}

      {computing && (
        <div className="rounded-lg border border-border/50 bg-card/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {data && data.total > 0
                ? `Scoring earnings history… ${data.done.toLocaleString()} / ${data.total.toLocaleString()}`
                : "Building the ≥$1B universe…"}
            </span>
            <span className="font-mono text-muted-foreground">{pct}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${data && data.total > 0 ? pct : 6}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            Scoring runs slowly (rate-limited) and normally happens overnight; rows appear as they&apos;re scored.
          </p>
        </div>
      )}

      {isError ? (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">
            Couldn&apos;t load momentum data. Ensure{" "}
            <code className="rounded bg-muted px-1 py-0.5">FINNHUB_API_KEY</code> and{" "}
            <code className="rounded bg-muted px-1 py-0.5">FINVIZ_API_KEY</code> are set.
          </p>
        </Card>
      ) : isLoading && rows.length === 0 ? (
        <div className="h-64 animate-pulse rounded-xl border border-border/50 bg-card/40" />
      ) : rows.length > 0 ? (
        <MomentumTable rows={rows} />
      ) : !computing ? (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">
            No scores yet — the nightly run will populate this. Check back shortly.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
