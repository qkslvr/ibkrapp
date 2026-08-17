"use client";

import { useMemo } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { NavShareChart } from "@/components/dashboard/nav-share-chart";
import { HoldingsTable } from "@/components/dashboard/holdings-table";
import { SectorChart, SectorCompany } from "@/components/dashboard/sector-chart";
import { PortfolioHeatmap } from "@/components/dashboard/portfolio-heatmap";
import { DividendsWidget } from "@/components/dashboard/dividends-widget";
import { RiskMetricsWidget } from "@/components/dashboard/risk-metrics";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { usePortfolioSummary } from "@/hooks/usePortfolioSummary";
import { usePositions } from "@/hooks/usePositions";
import { useTransactions } from "@/hooks/useTransactions";
import { useLiveNav } from "@/hooks/useLiveNav";
import { mockSectorAllocation } from "@/lib/mock-data";
import { DividendInfo, RiskMetrics, SectorAllocation } from "@/types";

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
  const live = useLiveNav();
  const nav = live.nav;

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

  // Holdings grouped by sector, for the sector chart's hover list.
  const companiesBySector = useMemo<Record<string, SectorCompany[]>>(() => {
    const map: Record<string, SectorCompany[]> = {};
    if (!positions?.length) return map;
    const total = positions.reduce((s, p) => s + Math.abs(p.marketValue), 0);
    for (const p of positions) {
      (map[p.sector] ??= []).push({
        symbol: p.symbol,
        name: p.name,
        weight: total > 0 ? (Math.abs(p.marketValue) / total) * 100 : 0,
        dayPct: p.dayChangePercent,
      });
    }
    return map;
  }, [positions]);

  // Hero metrics. The fund's NAV summary is authoritative (the IBKR account
  // summary's cost basis is unreliable), and intraday we use the LIVE value
  // (Finviz-priced holdings + cash) so the numbers move with the market.
  const heroPV = nav ? live.liveValue : summary?.totalValue ?? 0;
  const heroInvested = nav?.totalCapitalInvested ?? summary?.totalCost ?? 0;
  const heroReturn = nav ? heroPV - heroInvested : summary?.totalReturn ?? 0;
  const heroReturnPct = nav
    ? heroInvested > 0 ? (heroReturn / heroInvested) * 100 : 0
    : summary?.totalReturnPercent ?? 0;
  const heroCash = nav ? live.liveCash : summary?.cashBalance ?? 0;
  const heroDayPct = nav ? live.todayChangePct : summary?.dayChangePercent ?? 0;
  const heroDay = nav ? live.todayChangeValue : summary?.dayChange ?? 0;

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
    <div className="space-y-8">
      {/* Hero Metrics */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Portfolio Value"
          value={displaySummary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          change={displaySummary.dayChangePercent}
          changeLabel="today"
          size="lg"
        />
        <MetricCard
          title="Total Return"
          value={Math.abs(displaySummary.totalReturn).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          prefix={displaySummary.totalReturn >= 0 ? "+$" : "-$"}
          change={displaySummary.totalReturnPercent}
          changeLabel="all time"
        />
        <MetricCard
          title="Today's Change"
          value={Math.abs(displaySummary.dayChange).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          prefix={displaySummary.dayChange >= 0 ? "+$" : "-$"}
          change={displaySummary.dayChangePercent}
        />
        <MetricCard
          title="Cash Available"
          value={displaySummary.cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        />
      </div>

      {/* Performance Chart & Sector Allocation */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart, with the heatmap stretched as a wide row beneath it */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <NavShareChart />
          {!positionsLoading && positions && positions.length > 0 && (
            <PortfolioHeatmap positions={positions} />
          )}
        </div>
        {/* Sector fills the right column alongside both */}
        <div className="min-w-0">
          <SectorChart data={sectorAllocation} companies={companiesBySector} />
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
