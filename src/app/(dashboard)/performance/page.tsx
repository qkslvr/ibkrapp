"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Target, AlertTriangle, BarChart2, Activity } from "lucide-react";

interface AnalyticsData {
  returns: {
    mtd: number;
    ytd: number;
    oneMonth: number;
    monthly: { month: string; return: number }[];
    totalReturn: number;
    totalReturnDollar: number;
  };
  benchmark: {
    mtd: number;
    oneMonth: number;
    ytd: number;
    sinceInception: number;
    oneYear: number;
  };
  risk: {
    volatility: number;
    maxDrawdown: number;
    sharpe: number;
    beta: number;
    alpha: number;
  };
  attribution: {
    symbol: string;
    beta: number;
    alpha: number;
    contribution: number;
    weight: number;
    unrealizedPnl: number;
  }[];
  totalPortfolioValue: number;
}

function useAnalytics() {
  return useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/ibkr/analytics");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

function ReturnBadge({ value, className }: { value: number; className?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "font-mono text-sm font-medium",
        positive ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]",
        className
      )}
    >
      {positive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function MonthLabel({ month }: { month: string }) {
  const d = new Date(month + "-02");
  return <>{d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</>;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-secondary/50", className)} />;
}

function BenchmarkRows({ data }: { data: AnalyticsData }) {
  const rows = [
    { label: "Month to Date", portfolio: data.returns.mtd, benchmark: data.benchmark.mtd ?? 0 },
    { label: "1 Month", portfolio: data.returns.oneMonth, benchmark: data.benchmark.oneMonth ?? 0 },
    { label: "YTD (since Feb)", portfolio: data.returns.totalReturn, benchmark: data.benchmark.sinceInception ?? 0 },
  ];
  const maxVal = Math.max(...rows.flatMap((r) => [Math.abs(r.portfolio), Math.abs(r.benchmark)]), 1);

  return (
    <div className="space-y-5">
      {rows.map((item) => {
        const diff = item.portfolio - item.benchmark;
        return (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{item.label}</span>
              <span className={cn(
                "font-mono text-xs font-medium px-1.5 py-0.5 rounded",
                diff >= 0
                  ? "bg-[oklch(0.72_0.19_145)]/10 text-[oklch(0.72_0.19_145)]"
                  : "bg-[oklch(0.65_0.22_25)]/10 text-[oklch(0.65_0.22_25)]"
              )}>
                {diff >= 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(2)}% vs SPY
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-16 text-right text-xs text-muted-foreground">Portfolio</span>
                <div className="flex flex-1 items-center gap-1">
                  <div className="flex-1 overflow-hidden rounded-full bg-secondary h-2">
                    <div
                      className={cn("h-full rounded-full transition-all", item.portfolio >= 0 ? "bg-[oklch(0.72_0.19_145)]" : "bg-[oklch(0.65_0.22_25)]")}
                      style={{ width: `${(Math.abs(item.portfolio) / maxVal) * 100}%` }}
                    />
                  </div>
                  <span className={cn("w-14 text-right font-mono text-xs", item.portfolio >= 0 ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]")}>
                    {item.portfolio >= 0 ? "+" : ""}{item.portfolio.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-right text-xs text-muted-foreground">SPY</span>
                <div className="flex flex-1 items-center gap-1">
                  <div className="flex-1 overflow-hidden rounded-full bg-secondary h-2">
                    <div
                      className="h-full rounded-full bg-muted-foreground/50 transition-all"
                      style={{ width: `${(Math.abs(item.benchmark) / maxVal) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 text-right font-mono text-xs text-muted-foreground">
                    {item.benchmark >= 0 ? "+" : ""}{item.benchmark.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PerformancePage() {
  const { data, isLoading } = useAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance Analytics</h1>
        <p className="text-muted-foreground">
          Detailed analysis of your portfolio returns and risk metrics
        </p>
      </div>

      <PerformanceChart />

      <Tabs defaultValue="returns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
        </TabsList>

        {/* Returns Tab */}
        <TabsContent value="returns" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Period Returns */}
            <Card className="border-border/50 bg-card/50 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4" />
                Portfolio Returns
              </h3>
              {isLoading ? (
                <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5" />)}</div>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: "Month to Date", value: data!.returns.mtd },
                    { label: "1 Month", value: data!.returns.oneMonth },
                    { label: "Year to Date (since Feb)", value: data!.returns.totalReturn },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm">{item.label}</span>
                      <ReturnBadge value={item.value} />
                    </div>
                  ))}
                  <div className="border-t border-border/50 pt-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">Total Return</span>
                      <p className="text-xs text-muted-foreground">vs $1,000,000 deposited</p>
                    </div>
                    <div className="text-right">
                      <ReturnBadge value={data!.returns.totalReturn} className="text-base" />
                      <p className={cn("text-xs font-mono", data!.returns.totalReturnDollar >= 0 ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]")}>
                        {data!.returns.totalReturnDollar >= 0 ? "+" : ""}${data!.returns.totalReturnDollar.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* vs S&P 500 Benchmark */}
            <Card className="border-border/50 bg-card/50 p-6">
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                vs S&P 500 (SPY)
              </h3>
              {isLoading ? (
                <div className="space-y-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : (
                <BenchmarkRows data={data!} />
              )}
            </Card>

            {/* Monthly Breakdown */}
            <Card className="border-border/50 bg-card/50 p-6 md:col-span-2">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <BarChart2 className="h-4 w-4" />
                Monthly Returns
              </h3>
              {isLoading ? (
                <div className="flex gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 flex-1" />)}</div>
              ) : (
                <div className="flex items-end gap-3 h-28">
                  {data!.returns.monthly.map((m) => {
                    const positive = m.return >= 0;
                    const maxAbs = Math.max(...data!.returns.monthly.map((x) => Math.abs(x.return)), 1);
                    const barHeightPct = (Math.abs(m.return) / maxAbs) * 100;
                    return (
                      <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                        <span className={cn("text-xs font-mono font-medium", positive ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]")}>
                          {positive ? "+" : ""}{m.return.toFixed(1)}%
                        </span>
                        <div className="flex w-full flex-col justify-end" style={{ height: "64px" }}>
                          <div
                            className={cn("w-full rounded-sm transition-all", positive ? "bg-[oklch(0.72_0.19_145)]/80" : "bg-[oklch(0.65_0.22_25)]/80")}
                            style={{ height: `${barHeightPct}%`, minHeight: "4px" }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground"><MonthLabel month={m.month} /></span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)
              : [
                  {
                    label: "Portfolio Beta",
                    value: data!.risk.beta,
                    format: (v: number) => v.toFixed(2),
                    good: data!.risk.beta <= 2,
                    description: "vs S&P 500 (1Y, weighted)",
                  },
                  {
                    label: "Jensen's Alpha",
                    value: data!.risk.alpha,
                    format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`,
                    good: data!.risk.alpha >= 0,
                    description: "Annualised excess return (1Y)",
                  },
                  {
                    label: "Sharpe Ratio",
                    value: data!.risk.sharpe,
                    format: (v: number) => v.toFixed(2),
                    good: data!.risk.sharpe > 1,
                    description: "Risk-adjusted return (1M)",
                  },
                  {
                    label: "Volatility",
                    value: data!.risk.volatility,
                    format: (v: number) => `${v.toFixed(1)}%`,
                    good: data!.risk.volatility < 25,
                    description: "Annualised (1M window)",
                  },
                  {
                    label: "Max Drawdown",
                    value: data!.risk.maxDrawdown,
                    format: (v: number) => `${v.toFixed(2)}%`,
                    good: data!.risk.maxDrawdown > -10,
                    description: "Peak-to-trough (1M)",
                  },
                ].map((metric) => (
                  <Card key={metric.label} className="border-border/50 bg-card/50 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{metric.label}</p>
                        <p className={cn(
                          "mt-1 font-mono text-2xl font-semibold",
                          metric.good ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]"
                        )}>
                          {metric.format(metric.value)}
                        </p>
                      </div>
                      {metric.good
                        ? <TrendingUp className="h-4 w-4 text-[oklch(0.72_0.19_145)]" />
                        : <AlertTriangle className="h-4 w-4 text-[oklch(0.65_0.22_25)]" />}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{metric.description}</p>
                  </Card>
                ))}
          </div>

          {/* Per-position beta table */}
          {!isLoading && (
            <Card className="border-border/50 bg-card/50 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Activity className="h-4 w-4" />
                Per-Position Beta &amp; Alpha (vs SPY, 1Y)
              </h3>
              <div className="space-y-3">
                {data!.attribution.map((pos) => (
                  <div key={pos.symbol} className="flex items-center justify-between text-sm">
                    <span className="w-16 font-medium">{pos.symbol}</span>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Beta</p>
                        <p className={cn("font-mono font-medium", pos.beta > 2 ? "text-[oklch(0.65_0.22_25)]" : "text-foreground")}>
                          {pos.beta.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Alpha</p>
                        <p className={cn("font-mono font-medium", pos.alpha >= 0 ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]")}>
                          {pos.alpha >= 0 ? "+" : ""}{pos.alpha.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Attribution Tab */}
        <TabsContent value="attribution" className="space-y-6">
          <Card className="border-border/50 bg-card/50 p-6">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Return Attribution by Position (unrealized P&L vs cost basis)
            </h3>
            {isLoading ? (
              <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <div className="space-y-4">
                {data!.attribution.map((item) => (
                  <div key={item.symbol} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.symbol}</span>
                        <span className="text-xs text-muted-foreground">
                          ({item.weight.toFixed(1)}% of equity)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("text-xs", item.unrealizedPnl >= 0 ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]")}>
                          {item.unrealizedPnl >= 0 ? "+" : ""}${item.unrealizedPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        <ReturnBadge value={item.contribution} />
                      </div>
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn("transition-all", item.contribution >= 0 ? "bg-[oklch(0.72_0.19_145)]" : "bg-[oklch(0.65_0.22_25)]")}
                        style={{ width: `${Math.min(Math.abs(item.contribution) * 1.5, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && (
              <div className="mt-6 border-t border-border/50 pt-4 flex items-center justify-between">
                <span className="font-medium">Total Equity Return</span>
                <ReturnBadge value={data?.returns.totalReturn ?? 0} className="text-base" />
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
