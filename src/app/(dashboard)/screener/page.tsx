"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TickerSearch } from "@/components/screener/ticker-search";
import { MomentumTable } from "@/components/screener/momentum-table";
import { useMomentum, MomentumIndex } from "@/hooks/useMomentum";
import { THRESHOLDS } from "@/lib/momentum";

const INDEXES: { value: MomentumIndex; label: string }[] = [
  { value: "sp500", label: "S&P 500" },
  { value: "ndx", label: "NASDAQ 100" },
  { value: "dji", label: "Dow 30" },
];

export default function ScreenerPage() {
  const [index, setIndex] = useState<MomentumIndex>("sp500");
  const { data, isLoading, isError } = useMomentum(index);

  const status = data?.status;
  // Keep the live (partial) view ranked too — the server only sorts on finish.
  const rows = [...(data?.rows ?? [])].sort(
    (a, b) => b.m.score - a.m.score || (b.m.q8 ?? -1) - (a.m.q8 ?? -1),
  );
  const computing = status === "computing";
  const pct = data && data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">EPS Momentum Screener</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Finds accelerating earnings. From each index we keep the names with positive recent
          EPS growth, then score trailing-12-month EPS growth over{" "}
          <span className="text-foreground">2 / 4 / 6 / 8 quarters</span> against{" "}
          <span className="text-foreground">
            &gt;{THRESHOLDS.q2}% / &gt;{THRESHOLDS.q4}% / &gt;{THRESHOLDS.q6}% / &gt;{THRESHOLDS.q8}%
          </span>
          . One point per threshold met — ranked by score.
        </p>
      </div>

      <TickerSearch />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={index} onValueChange={(v) => setIndex(v as MomentumIndex)}>
          <TabsList>
            {INDEXES.map((i) => (
              <TabsTrigger key={i.value} value={i.value}>
                {i.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {data?.status === "ready" && (
          <p className="text-xs text-muted-foreground">
            {rows.length} scored · updated{" "}
            {new Date(data.computedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {computing && (
        <div className="rounded-lg border border-border/50 bg-card/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {data && data.total > 0
                ? `Scoring earnings history… ${data.done} / ${data.total}`
                : "Selecting momentum candidates…"}
            </span>
            <span className="font-mono text-muted-foreground">{pct}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${data && data.total > 0 ? pct : 8}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            First run for an index scores each candidate&apos;s quarterly EPS history (rate-limited);
            results are cached for a day. Rows appear as they&apos;re scored.
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
          <p className="text-muted-foreground">No candidates scored for this index.</p>
        </Card>
      ) : null}
    </div>
  );
}
