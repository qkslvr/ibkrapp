"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNAV } from "@/hooks/useNAV";
import { cn } from "@/lib/utils";

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "ALL", days: 100000 },
] as const;

function money(n: number, dp = 2) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

type Metric = "nav" | "value";

export function NavShareChart() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[3]);
  const [metric, setMetric] = useState<Metric>("nav");
  const { data: nav, isLoading } = useNAV();

  const daily = nav?.daily ?? [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range.days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const chartData = daily
    .filter((d) => range.label === "ALL" || d.date >= cutoffStr)
    .map((d) => ({
      date: d.date,
      value: metric === "nav" ? +d.nav.toFixed(4) : +d.portfolioValue.toFixed(2),
    }));

  // Subscription markers — dots on the days capital came in (the visible jumps).
  const subByDate = new Map<string, { amount: number; ccy: string }>();
  for (const d of nav?.deposits ?? []) {
    const prev = subByDate.get(d.date);
    subByDate.set(d.date, {
      amount: (prev?.amount ?? 0) + d.amount,
      ccy: prev && prev.ccy !== d.originalCurrency ? "USD" : d.originalCurrency,
    });
  }
  const subMarkers = chartData
    .filter((p) => subByDate.has(p.date))
    .map((p) => ({ date: p.date, value: p.value, ...subByDate.get(p.date)! }));

  const isNav = metric === "nav";
  const currentNav = nav?.currentNAV ?? 100;
  const portfolioValue = nav?.currentPortfolioValue ?? 0;
  const cash = nav?.currentCash ?? 0;
  const returnPct = nav?.totalReturnPct ?? 0;
  const isPositive = returnPct >= 0;
  const stroke = isPositive ? "oklch(0.72 0.19 145)" : "oklch(0.65 0.22 25)";
  const gradientId = "navShareGradient";

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const formatY = (v: number) =>
    isNav ? "$" + v.toFixed(0) : "$" + (v / 1000).toFixed(0) + "k";

  return (
    <Card className="border-border/50 bg-card/50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {isNav ? "NAV per Share" : "Portfolio Value"}
            </h3>
            <div className="flex gap-0.5 rounded-md bg-secondary/50 p-0.5">
              {(["nav", "value"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[11px] transition-colors",
                    metric === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "nav" ? "NAV/Share" : "Value"}
                </button>
              ))}
            </div>
          </div>
          {isLoading ? (
            <div className="mt-1 h-9 w-40 animate-pulse rounded bg-secondary/50" />
          ) : (
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-3xl font-semibold tracking-tight">
                {isNav ? money(currentNav) : money(portfolioValue)}
              </p>
              <span
                className={cn(
                  "text-sm font-medium",
                  isPositive ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]",
                )}
              >
                {isPositive ? "+" : ""}
                {returnPct.toFixed(2)}% vs base $100
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-1 rounded-lg bg-secondary/50 p-1">
          {RANGES.map((r) => (
            <Button
              key={r.label}
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2.5 text-xs", range.label === r.label && "bg-background shadow-sm")}
              onClick={() => setRange(r)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Reconciling breakdown: Securities + Cash = Portfolio Value; Invested = cost */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-y border-border/50 py-3 sm:grid-cols-4">
        <Stat label="Portfolio Value" value={money(portfolioValue)} />
        <Stat label="Securities" value={money(Math.max(portfolioValue - cash, 0))} />
        <Stat label="Cash Balance" value={money(cash)} />
        <Stat label="Total Invested" value={money(nav?.totalCapitalInvested ?? 0)} />
      </div>

      <div className="mt-4 h-64">
        {isLoading ? (
          <div className="h-full w-full animate-pulse rounded bg-secondary/50" />
        ) : chartData.length < 2 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Not enough NAV history yet for this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
                {/* Accent stroke ramp — indigo → violet → warm amber */}
                <linearGradient id="navStrokeRamp" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="oklch(0.72 0.16 258)" />
                  <stop offset="55%" stopColor="oklch(0.68 0.19 305)" />
                  <stop offset="100%" stopColor="oklch(0.82 0.15 78)" />
                </linearGradient>
                <filter id="navGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "oklch(0.65 0 0)", fontSize: 11 }}
                tickFormatter={formatDate}
                tickMargin={10}
                minTickGap={50}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "oklch(0.65 0 0)", fontSize: 11 }}
                tickFormatter={(v) => formatY(v as number)}
                width={48}
                domain={["auto", "auto"]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const p = payload[0].payload as { date: string; value: number };
                    const sub = subByDate.get(p.date);
                    return (
                      <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-lg">
                        <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                        <p className="font-mono font-medium">{money(p.value, isNav ? 4 : 2)}</p>
                        {sub && (
                          <p className="mt-1 text-xs font-medium text-[oklch(0.72_0.19_145)]">
                            +{money(sub.amount)} subscribed
                            {sub.ccy !== "USD" ? ` (${sub.ccy})` : ""}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {isNav && (
                <ReferenceLine
                  y={100}
                  stroke="oklch(0.82 0.15 78 / 0.45)"
                  strokeDasharray="4 4"
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke="url(#navStrokeRamp)"
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                style={{ filter: "url(#navGlow)" }}
                activeDot={{ r: 4, strokeWidth: 0, fill: "oklch(0.82 0.15 78)" }}
              />
              {subMarkers.map((m) => (
                <ReferenceDot
                  key={m.date}
                  x={m.date}
                  y={m.value}
                  r={4}
                  fill="oklch(0.7 0.15 250)"
                  stroke="oklch(0.18 0.01 270)"
                  strokeWidth={1.5}
                  ifOverflow="extendDomain"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
