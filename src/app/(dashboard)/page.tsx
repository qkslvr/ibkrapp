"use client";

import { useMemo } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { HoldingsTable } from "@/components/dashboard/holdings-table";
import { SectorChart } from "@/components/dashboard/sector-chart";
import { TopMovers } from "@/components/dashboard/top-movers";
import { DividendsWidget } from "@/components/dashboard/dividends-widget";
import { RiskMetricsWidget } from "@/components/dashboard/risk-metrics";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { usePortfolioSummary } from "@/hooks/usePortfolioSummary";
import { usePositions } from "@/hooks/usePositions";
import { useTransactions } from "@/hooks/useTransactions";
import {
  mockDividendInfo,
  mockRiskMetrics,
  mockSectorAllocation,
} from "@/lib/mock-data";
import { SectorAllocation, TopMover } from "@/types";

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#6366f1",
  Financials: "#22c55e",
  Healthcare: "#eab308",
  Energy: "#a855f7",
  "Consumer Staples": "#f97316",
  "Consumer Discretionary": "#ec4899",
  Utilities: "#14b8a6",
  "Real Estate": "#f59e0b",
  Materials: "#84cc16",
  Industrials: "#06b6d4",
  "Communication Services": "#8b5cf6",
  Cash: "#64748b",
};

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = usePortfolioSummary();
  const { data: positions, isLoading: positionsLoading } = usePositions();
  const { data: transactions } = useTransactions(30);

  const sectorAllocation = useMemo<SectorAllocation[]>(() => {
    if (!positions?.length) return mockSectorAllocation;
    const totalValue = positions.reduce((s, p) => s + p.marketValue, 0);
    const bysector: Record<string, number> = {};
    for (const p of positions) {
      bysector[p.sector] = (bysector[p.sector] ?? 0) + p.marketValue;
    }
    return Object.entries(bysector).map(([sector, value]) => ({
      sector,
      value,
      weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
      color: SECTOR_COLORS[sector] ?? "#94a3b8",
    }));
  }, [positions]);

  const topMovers = useMemo<{ gainers: TopMover[]; losers: TopMover[] }>(() => {
    if (!positions?.length) {
      return { gainers: [], losers: [] };
    }
    const sorted = [...positions].sort(
      (a, b) => b.dayChangePercent - a.dayChangePercent
    );
    return {
      gainers: sorted
        .filter((p) => p.dayChangePercent > 0)
        .slice(0, 3)
        .map((p) => ({
          symbol: p.symbol,
          name: p.name,
          change: p.dayChange,
          changePercent: p.dayChangePercent,
        })),
      losers: sorted
        .filter((p) => p.dayChangePercent < 0)
        .slice(-3)
        .reverse()
        .map((p) => ({
          symbol: p.symbol,
          name: p.name,
          change: p.dayChange,
          changePercent: p.dayChangePercent,
        })),
    };
  }, [positions]);

  const displaySummary = summary ?? {
    totalValue: 0,
    totalReturn: 0,
    totalReturnPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
    cashBalance: 0,
    totalCost: 0,
    buyingPower: 0,
    marginUsed: 0,
  };

  return (
    <div className="space-y-6">
      {/* Hero Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Portfolio Value"
          value={displaySummary.totalValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
          change={displaySummary.dayChangePercent}
          changeLabel="today"
          size="lg"
        />
        <MetricCard
          title="Total Return"
          value={displaySummary.totalReturn.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
          change={displaySummary.totalReturnPercent}
          changeLabel="all time"
        />
        <MetricCard
          title="Today's Change"
          value={Math.abs(displaySummary.dayChange).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
          prefix={displaySummary.dayChange >= 0 ? "+$" : "-$"}
          change={displaySummary.dayChangePercent}
        />
        <MetricCard
          title="Cash Available"
          value={displaySummary.cashBalance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        />
      </div>

      {/* Performance Chart & Sector Allocation */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>
        <div className="space-y-6">
          <SectorChart data={sectorAllocation} />
          {!positionsLoading && (
            <TopMovers
              gainers={topMovers.gainers}
              losers={topMovers.losers}
            />
          )}
        </div>
      </div>

      {/* Holdings Table */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Holdings</h2>
        {!positionsLoading && positions && (
          <HoldingsTable positions={positions} />
        )}
        {positionsLoading && (
          <div className="h-32 rounded-lg bg-card/50 border border-border/50 animate-pulse" />
        )}
      </div>

      {/* Bottom Widgets */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DividendsWidget data={mockDividendInfo} />
        <RiskMetricsWidget data={mockRiskMetrics} />
        <RecentActivity transactions={transactions ?? []} />
      </div>

      {/* Loading indicator when fetching real data */}
      {(summaryLoading || positionsLoading) && (
        <p className="text-center text-xs text-muted-foreground">
          Loading live data...
        </p>
      )}
    </div>
  );
}
