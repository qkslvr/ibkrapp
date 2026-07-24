"use client";

import { useMemo } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { NavShareChart } from "@/components/dashboard/nav-share-chart";
import { HoldingsTable } from "@/components/dashboard/holdings-table";
import { SectorChart } from "@/components/dashboard/sector-chart";
import { TopMovers } from "@/components/dashboard/top-movers";
import { DividendsWidget } from "@/components/dashboard/dividends-widget";
import { RiskMetricsWidget } from "@/components/dashboard/risk-metrics";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { usePortfolioSummary } from "@/hooks/usePortfolioSummary";
import { usePositions } from "@/hooks/usePositions";
import { useTransactions } from "@/hooks/useTransactions";
import { useNAV } from "@/hooks/useNAV";
import { mockSectorAllocation } from "@/lib/mock-data";
import { DividendInfo, RiskMetrics, SectorAllocation, TopMover } from "@/types";

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
  const { data: nav } = useNAV();

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

  // Hero metrics. The fund's NAV summary is authoritative for value / invested /
  // return / cash (the IBKR account summary's cost basis is unreliable here).
  const lastDaily = nav?.daily?.[nav.daily.length - 1];
  const heroPV = nav?.currentPortfolioValue ?? summary?.totalValue ?? 0;
  const heroInvested = nav?.totalCapitalInvested ?? summary?.totalCost ?? 0;
  const heroReturn = nav ? heroPV - heroInvested : summary?.totalReturn ?? 0;
  const heroReturnPct = nav
    ? heroInvested > 0 ? (heroReturn / heroInvested) * 100 : 0
    : summary?.totalReturnPercent ?? 0;
  const heroCash = nav?.currentCash ?? summary?.cashBalance ?? 0;
  const heroDayPct = lastDaily?.navChangePct ?? summary?.dayChangePercent ?? 0;
  const heroDay = nav ? (heroDayPct / 100) * heroPV : summary?.dayChange ?? 0;

  const displaySummary = {
    totalValue: heroPV,
    totalReturn: heroReturn,
    totalReturnPercent: heroReturnPct,
    dayChange: heroDay,
    dayChangePercent: heroDayPct,
    cashBalance: heroCash,
  };

  // Real dividend & risk, from Finviz per-holding data + the fund NAV series.
  const withBeta = (positions ?? []).filter((p) => p.beta != null);
  const betaBase = withBeta.reduce((s, p) => s + Math.abs(p.marketValue), 0);
  const portfolioBeta =
    betaBase > 0
      ? withBeta.reduce((s, p) => s + (p.beta as number) * (Math.abs(p.marketValue) / betaBase), 0)
      : 0;
  const projectedAnnualDiv = (positions ?? []).reduce(
    (s, p) => s + Math.abs(p.marketValue) * ((p.dividendYield ?? 0) / 100),
    0,
  );
  const dividendInfo: DividendInfo = {
    ytdIncome: nav?.dividendYtd ?? 0,
    projectedAnnual: projectedAnnualDiv,
    portfolioYield: heroPV > 0 ? (projectedAnnualDiv / heroPV) * 100 : 0,
  };
  const riskMetrics: RiskMetrics = {
    beta: +portfolioBeta.toFixed(2),
    volatility: nav?.risk.volatility ?? 0,
    sharpeRatio: nav?.risk.sharpeRatio ?? 0,
    maxDrawdown: nav?.risk.maxDrawdown ?? 0,
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
          <NavShareChart />
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
          <HoldingsTable positions={positions} totalPortfolioValue={heroPV} />
        )}
        {positionsLoading && (
          <div className="h-32 rounded-lg bg-card/50 border border-border/50 animate-pulse" />
        )}
      </div>

      {/* Bottom Widgets */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DividendsWidget data={dividendInfo} />
        <RiskMetricsWidget data={riskMetrics} />
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
