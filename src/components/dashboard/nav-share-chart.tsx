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

export function NavShareChart() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[3]);
  const { data: nav, isLoading } = useNAV();

  const daily = nav?.daily ?? [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range.days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const chartData = daily
    .filter((d) => range.label === "ALL" || d.date >= cutoffStr)
    .map((d) => ({ date: d.date, nav: +d.nav.toFixed(4) }));

  const currentNav = nav?.currentNAV ?? 100;
  const returnPct = nav?.totalReturnPct ?? 0;
  const isPositive = returnPct >= 0;
  const stroke = isPositive ? "oklch(0.72 0.19 145)" : "oklch(0.65 0.22 25)";
  const gradientId = "navShareGradient";

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <Card className="border-border/50 bg-card/50 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">NAV per Share</h3>
          {isLoading ? (
            <div className="mt-1 h-9 w-40 animate-pulse rounded bg-secondary/50" />
          ) : (
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-3xl font-semibold tracking-tight">{money(currentNav)}</p>
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

      {/* Portfolio USD value · Total Invested · Cash balance */}
      <div className="mt-4 grid grid-cols-3 gap-4 border-y border-border/50 py-3">
        <Stat label="Portfolio Value" value={money(nav?.currentPortfolioValue ?? 0)} />
        <Stat label="Total Invested" value={money(nav?.totalCapitalInvested ?? 0)} />
        <Stat label="Cash Balance" value={money(nav?.currentCash ?? 0)} />
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
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
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
                tickFormatter={(v) => "$" + (v as number).toFixed(0)}
                width={44}
                domain={["auto", "auto"]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const p = payload[0].payload as { date: string; nav: number };
                    return (
                      <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-lg">
                        <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                        <p className="font-mono font-medium">{money(p.nav, 4)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={100} stroke="oklch(0.4 0 0)" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="nav"
                stroke={stroke}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
