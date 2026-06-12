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
import { ChartTimeframe } from "@/types";
import { usePerformance } from "@/hooks/usePerformance";
import { cn } from "@/lib/utils";

const timeframes: ChartTimeframe[] = [
  { label: "1D", value: "1D", days: 1 },
  { label: "1W", value: "1W", days: 7 },
  { label: "1M", value: "1M", days: 30 },
  { label: "3M", value: "3M", days: 90 },
  { label: "6M", value: "6M", days: 180 },
  { label: "YTD", value: "YTD", days: 365 },
  { label: "1Y", value: "1Y", days: 365 },
  { label: "ALL", value: "ALL", days: 9999 },
];

export function PerformanceChart() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<ChartTimeframe>(timeframes[2]);
  const { data: perf, isLoading } = usePerformance(selectedTimeframe.value);

  const data = perf?.data ?? [];
  const startValue = perf?.startValue ?? 0;

  const currentValue = data[data.length - 1]?.value ?? 0;
  const change = currentValue - startValue;
  const changePercent = startValue > 0 ? (change / startValue) * 100 : 0;
  const isPositive = change >= 0;

  const gradientId = "portfolioGradient";
  const strokeColor = isPositive ? "oklch(0.72 0.19 145)" : "oklch(0.65 0.22 25)";

  const formatValue = (value: number) =>
    `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <Card className="border-border/50 bg-card/50 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Portfolio Performance</h3>
          {isLoading ? (
            <div className="mt-1 h-9 w-40 animate-pulse rounded bg-secondary/50" />
          ) : (
            <>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                ${currentValue.toLocaleString()}
              </p>
              <div
                className={cn(
                  "mt-1 flex items-center gap-2 text-sm font-medium",
                  isPositive ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]"
                )}
              >
                <span>
                  {isPositive ? "+" : ""}
                  {formatValue(change)}
                </span>
                <span className="opacity-80">
                  ({isPositive ? "+" : ""}
                  {changePercent.toFixed(2)}%)
                </span>
                <span className="text-muted-foreground">· {selectedTimeframe.label}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-1 rounded-lg bg-secondary/50 p-1">
          {timeframes.map((tf) => (
            <Button
              key={tf.value}
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2.5 text-xs",
                selectedTimeframe.value === tf.value && "bg-background shadow-sm"
              )}
              onClick={() => setSelectedTimeframe(tf)}
            >
              {tf.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-6 h-64">
        {isLoading ? (
          <div className="h-full w-full animate-pulse rounded bg-secondary/50" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
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
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={50}
                domain={["dataMin - 1000", "dataMax + 1000"]}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload as { date: string; value: number };
                    return (
                      <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-lg">
                        <p className="text-xs text-muted-foreground">{formatDate(point.date)}</p>
                        <p className="font-mono font-medium">${point.value.toLocaleString()}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <ReferenceLine y={startValue} stroke="oklch(0.4 0 0)" strokeDasharray="3 3" />

              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
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
