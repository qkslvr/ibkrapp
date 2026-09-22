"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { TickerSearch } from "@/components/screener/ticker-search";
import { ScreensTable } from "@/components/screener/screens-table";
import { useScreens } from "@/hooks/useScreens";
import { DEFAULT_SCREEN } from "@/lib/screens";
import { ChevronDown } from "lucide-react";

export default function ScreenerPage() {
  const [screenId, setScreenId] = useState<string>(DEFAULT_SCREEN);
  const { data, isLoading, isError } = useScreens(screenId);

  const rows = data?.rows ?? [];
  const computing = data?.status === "computing";
  const pct = data && data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
  const screens = data?.screens ?? [];
  const screen = data?.screen;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Screens</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Curated momentum &amp; value setups over every US stock with a market cap above{" "}
          <span className="text-foreground">$1B</span>. Fundamentals and prices are re-indexed nightly;
          pick a screen and sort any column.
        </p>
      </div>

      <TickerSearch />

      {/* screen selector */}
      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">Screen</span>
          <div className="relative">
            <select
              value={screenId}
              onChange={(e) => setScreenId(e.target.value)}
              className="h-11 w-[20rem] max-w-full appearance-none rounded-lg border border-border bg-secondary/50 pl-4 pr-10 text-base font-medium text-foreground focus:border-primary/60 focus:outline-none"
            >
              {screens.length === 0 && <option value={DEFAULT_SCREEN}>Loading…</option>}
              {screens.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </label>
        {screen && (
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-sm text-foreground">{screen.tagline}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{screen.rule}</p>
          </div>
        )}
      </div>

      {data?.status === "ready" && (
        <p className="text-xs text-muted-foreground">
          Index updated{" "}
          {new Date(data.computedAt).toLocaleString(undefined, {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
          {" · "}{data.matched.toLocaleString()} names match{" · "}auto-refreshes nightly
        </p>
      )}

      {computing && (
        <div className="rounded-lg border border-border/50 bg-card/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {data && data.total > 0
                ? `Indexing fundamentals… ${data.done.toLocaleString()} / ${data.total.toLocaleString()}`
                : "Building the ≥$1B universe…"}
            </span>
            <span className="font-mono text-muted-foreground">{pct}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${data && data.total > 0 ? pct : 6}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            Indexing runs slowly (rate-limited) and normally happens overnight; results fill in as names are scored.
          </p>
        </div>
      )}

      {isError ? (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">
            Couldn&apos;t load screens. Ensure{" "}
            <code className="rounded bg-muted px-1 py-0.5">FINNHUB_API_KEY</code> and{" "}
            <code className="rounded bg-muted px-1 py-0.5">FINVIZ_API_KEY</code> are set.
          </p>
        </Card>
      ) : isLoading && rows.length === 0 ? (
        <div className="h-64 animate-pulse rounded-xl border border-border/50 bg-card/40" />
      ) : rows.length > 0 && screen ? (
        <ScreensTable rows={rows} metrics={screen.metrics} defaultSort={screen.defaultSort} />
      ) : !computing ? (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">No names currently match this screen.</p>
        </Card>
      ) : null}
    </div>
  );
}
