"use client";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { useNAV } from "@/hooks/useNAV";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Users, BarChart3, ArrowUpDown, Download } from "lucide-react";
import type { NAVSummary } from "@/types";
import { downloadMonthlyReport } from "@/lib/nav-pdf";

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCurrency(n: number) {
  return "$" + fmt(n);
}

function SortHeader({
  label,
  k,
  align = "right",
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  k: SortKey;
  align?: "left" | "right";
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <TableHead className={align === "right" ? "text-right" : ""}>
      <button
        onClick={() => onSort(k)}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground",
          align === "right" && "flex-row-reverse",
          active && "text-foreground",
        )}
      >
        <span>{label}</span>
        {active ? (
          <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

// ── Combined ledger (daily balances + subscriptions) ───────────────────────────
type LedgerKind = "Balance" | "Subscription";
type SortKey =
  | "date"
  | "portfolioValue"
  | "navAtSub"
  | "unitsIssued"
  | "unitsOutstanding"
  | "navPerUnit"
  | "navChangePct"
  | "returnPct";

interface LedgerRow {
  key: string;
  date: string;
  kind: LedgerKind;
  portfolioValue: number | null;
  navAtSub: number | null;
  unitsIssued: number | null;
  unitsOutstanding: number;
  navPerUnit: number | null;
  navChangePct: number | null; // day-over-day NAV move (balance rows only)
  returnPct: number;
  originalCurrency?: string;
  originalAmount?: number;
  amountUSD?: number;
}

// One row per daily balance and one per subscription. Subscription rows leave
// the balance/NAV-per-unit cells blank; balance rows leave NAV-at-subscription
// and units-issued blank.
function buildLedger(nav: NAVSummary | null | undefined): LedgerRow[] {
  if (!nav) return [];
  const rows: LedgerRow[] = [];

  for (const d of nav.daily ?? []) {
    rows.push({
      key: `bal-${d.date}`,
      date: d.date,
      kind: "Balance",
      portfolioValue: d.portfolioValue,
      navAtSub: null,
      unitsIssued: null,
      unitsOutstanding: d.totalUnits,
      navPerUnit: d.nav,
      navChangePct: d.navChangePct ?? 0,
      returnPct: d.returnPct,
    });
  }

  const depsAsc = [...nav.deposits].sort((a, b) => a.date.localeCompare(b.date));
  let cum = 0;
  depsAsc.forEach((dep, i) => {
    cum += dep.unitsIssued;
    rows.push({
      key: `sub-${dep.date}-${i}`,
      date: dep.date,
      kind: "Subscription",
      portfolioValue: null,
      navAtSub: dep.navAtDeposit,
      unitsIssued: dep.unitsIssued,
      unitsOutstanding: cum,
      navPerUnit: null,
      navChangePct: null,
      returnPct: ((dep.navAtDeposit - 100) / 100) * 100,
      originalCurrency: dep.originalCurrency,
      originalAmount: dep.originalAmount,
      amountUSD: dep.amount,
    });
  });

  return rows;
}

function sortLedger(rows: LedgerRow[], key: SortKey, dir: "asc" | "desc"): LedgerRow[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "date") {
      const c = a.date.localeCompare(b.date);
      if (c !== 0) return c * mul;
      // Same date: always show the Subscription first, then the resulting
      // Balance — reading top-down then mirrors how NAV is actually derived
      // (units issued, then the post-deposit balance). Independent of sort dir.
      const rank = (k: LedgerKind) => (k === "Subscription" ? 0 : 1);
      return rank(a.kind) - rank(b.kind);
    }
    const av = a[key] as number | null;
    const bv = b[key] as number | null;
    if (av == null && bv == null) return 0;
    if (av == null) return 1; // blanks always sink to the bottom
    if (bv == null) return -1;
    return (av - bv) * mul;
  });
}

export default function NAVPage() {
  const { data: nav, isLoading } = useNAV();
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [typeFilter, setTypeFilter] = useState<"all" | LedgerKind>("all");
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);

  const ledger = useMemo(() => buildLedger(nav), [nav]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Calculating NAV...
      </div>
    );
  }

  if (!nav) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No NAV data available. Ensure your Flex query includes EquitySummaryByReportDateInBase.
      </div>
    );
  }

  const isPositive = nav.totalReturnPct >= 0;

  // Prefer the real daily series (portfolio balance + NAV per day). Fall back to
  // the monthly snapshots if a daily series isn't available yet.
  const daily = nav.daily ?? [];
  const hasDaily = daily.length > 1;

  const balanceData = daily.map((d) => ({
    label: format(parseISO(d.date), "MMM d"),
    date: d.date,
    balance: +d.portfolioValue.toFixed(2),
    nav: +d.nav.toFixed(4),
  }));

  const chartData = hasDaily
    ? balanceData
    : nav.monthly.map((m) => ({
        label: format(parseISO(m.month + "-01"), "MMM yy"),
        date: m.month + "-01",
        nav: +m.nav.toFixed(4),
        balance: m.portfolioValue,
      }));

  // Subscription markers keyed by the chart's x-axis label (the days capital
  // arrived — the visible step-ups in the balance line).
  const subDates = new Set(nav.deposits.map((d) => d.date));
  const subMarkers = chartData.filter((p) => subDates.has(p.date));

  const visibleRows = sortLedger(
    typeFilter === "all" ? ledger : ledger.filter((r) => r.kind === typeFilter),
    sortKey,
    sortDir,
  );

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" || key === "returnPct" ? "desc" : "desc");
    }
  }

  async function handlePdf(month: string) {
    if (!nav) return;
    setPdfBusy(month);
    try {
      await downloadMonthlyReport(nav, month);
    } finally {
      setPdfBusy(null);
    }
  }

  const dash = <span className="text-muted-foreground/40">—</span>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fund NAV</h1>
        <p className="text-muted-foreground">Net Asset Value tracking and investor report</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Current NAV / Unit
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold">{fmtCurrency(nav.currentNAV)}</p>
          <p className={cn("mt-1 text-xs", isPositive ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]")}>
            {isPositive ? "+" : ""}{fmt(nav.totalReturnPct)}% vs base $100
          </p>
        </Card>

        <Card className="border-border/50 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Total Units Outstanding
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold">{fmt(nav.totalUnits, 4)}</p>
        </Card>

        <Card className="border-border/50 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            Portfolio Value
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold">{fmtCurrency(nav.currentPortfolioValue)}</p>
        </Card>

        <Card className="border-border/50 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            Total Capital Invested
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold">{fmtCurrency(nav.totalCapitalInvested)}</p>
          <p className={cn("mt-1 text-xs", isPositive ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]")}>
            {isPositive ? "+" : ""}{fmtCurrency(nav.currentPortfolioValue - nav.totalCapitalInvested)} unrealised P&L
          </p>
        </Card>
      </div>

      {/* Portfolio Balance Chart */}
      {chartData.length > 1 && (
        <Card className="border-border/50 bg-card/50 p-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Portfolio Balance{hasDaily ? " — Daily" : " — Monthly"}
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="oklch(1 0 0 / 0.2)" minTickGap={24} />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11 }}
                stroke="oklch(1 0 0 / 0.2)"
                tickFormatter={(v) => "$" + (v as number).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 })}
              />
              <Tooltip
                contentStyle={{ background: "oklch(0.18 0.01 270)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }}
                formatter={(v: unknown) => ["$" + (v as number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "Balance"] as [string, string]}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="oklch(0.7 0.15 250)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              {subMarkers.map((m) => (
                <ReferenceDot
                  key={m.date}
                  x={m.label}
                  y={m.balance}
                  r={4}
                  fill="oklch(0.72 0.19 145)"
                  stroke="oklch(0.18 0.01 270)"
                  strokeWidth={1.5}
                  ifOverflow="extendDomain"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* NAV Chart */}
      {chartData.length > 1 && (
        <Card className="border-border/50 bg-card/50 p-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            NAV per Unit{hasDaily ? " — Daily" : " — Monthly"}
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="oklch(1 0 0 / 0.2)" />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11 }}
                stroke="oklch(1 0 0 / 0.2)"
                tickFormatter={(v) => "$" + v.toFixed(0)}
              />
              <Tooltip
                contentStyle={{ background: "oklch(0.18 0.01 270)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }}
                formatter={(v: unknown) => ["$" + (v as number).toFixed(4), "NAV/unit"] as [string, string]}
              />
              <ReferenceLine y={100} stroke="oklch(1 0 0 / 0.2)" strokeDasharray="4 4" label={{ value: "Base $100", position: "insideTopRight", fontSize: 10, fill: "oklch(1 0 0 / 0.4)" }} />
              <Line
                type="monotone"
                dataKey="nav"
                stroke="oklch(0.72 0.19 145)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              {subMarkers.map((m) => (
                <ReferenceDot
                  key={m.date}
                  x={m.label}
                  y={m.nav}
                  r={4}
                  fill="oklch(0.7 0.15 250)"
                  stroke="oklch(0.18 0.01 270)"
                  strokeWidth={1.5}
                  ifOverflow="extendDomain"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Combined Ledger: daily balances + subscriptions */}
      <Card className="border-border/50 bg-card/50">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-6 py-4">
          <div>
            <h2 className="text-sm font-medium">Fund Ledger — Balances &amp; Subscriptions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              NAV / unit = portfolio balance ÷ units outstanding. Subscriptions are priced at the NAV on their date; non-USD deposits count the USD credited.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border/50 p-0.5">
            {(["all", "Balance", "Subscription"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs transition-colors",
                  typeFilter === t ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "all" ? "All" : t === "Balance" ? "Balances" : "Subscriptions"}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[460px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <TableRow>
                <SortHeader label="Date" k="date" align="left" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <TableHead>Type</TableHead>
                <SortHeader label="Portfolio Balance" k="portfolioValue" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="NAV @ Sub" k="navAtSub" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Units Issued" k="unitsIssued" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Units Outstanding" k="unitsOutstanding" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="NAV / Unit" k="navPerUnit" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Daily Δ" k="navChangePct" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Return vs Base" k="returnPct" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(parseISO(r.date), "MMM d, yyyy")}
                    {r.kind === "Subscription" && (
                      <span className="block text-xs text-muted-foreground/70">
                        {r.originalCurrency && r.originalCurrency !== "USD"
                          ? `${r.originalCurrency} ${fmt(r.originalAmount ?? 0)} → ${fmtCurrency(r.amountUSD ?? 0)}`
                          : fmtCurrency(r.amountUSD ?? 0)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-normal",
                        r.kind === "Subscription"
                          ? "border-[oklch(0.7_0.15_250)]/40 text-[oklch(0.7_0.15_250)]"
                          : "border-border/60 text-muted-foreground",
                      )}
                    >
                      {r.kind}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {r.portfolioValue != null ? fmtCurrency(r.portfolioValue) : dash}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {r.navAtSub != null ? fmtCurrency(r.navAtSub) : dash}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {r.unitsIssued != null ? fmt(r.unitsIssued, 4) : dash}
                  </TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.unitsOutstanding, 4)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {r.navPerUnit != null ? fmtCurrency(r.navPerUnit) : dash}
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-sm", r.navChangePct == null ? "" : r.navChangePct >= 0 ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]")}>
                    {r.navChangePct == null ? dash : `${r.navChangePct >= 0 ? "+" : ""}${fmt(r.navChangePct)}%`}
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-sm", r.returnPct >= 0 ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]")}>
                    {r.returnPct >= 0 ? "+" : ""}{fmt(r.returnPct)}%
                  </TableCell>
                </TableRow>
              ))}
              {visibleRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                    No rows for this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Monthly NAV Table */}
      <Card className="border-border/50 bg-card/50">
        <div className="border-b border-border/50 px-6 py-4">
          <h2 className="text-sm font-medium">Monthly NAV Report</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download a month-end PDF: subscriptions booked that month, their effect on NAV, and the daily balance/NAV table.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Portfolio Value</TableHead>
              <TableHead className="text-right">Units Outstanding</TableHead>
              <TableHead className="text-right">NAV / Unit</TableHead>
              <TableHead className="text-right">Return vs Base</TableHead>
              <TableHead className="text-right">Report</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...nav.monthly].reverse().map((m) => (
              <TableRow key={m.month}>
                <TableCell className="text-muted-foreground">
                  {format(parseISO(m.month + "-01"), "MMMM yyyy")}
                </TableCell>
                <TableCell className="text-right font-mono">{fmtCurrency(m.portfolioValue)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(m.totalUnits, 4)}</TableCell>
                <TableCell className="text-right font-mono font-medium">{fmtCurrency(m.nav)}</TableCell>
                <TableCell className={cn("text-right font-mono text-sm", m.returnPct >= 0 ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]")}>
                  {m.returnPct >= 0 ? "+" : ""}{fmt(m.returnPct)}%
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    disabled={pdfBusy === m.month}
                    onClick={() => handlePdf(m.month)}
                  >
                    <Download className="h-3 w-3" />
                    {pdfBusy === m.month ? "…" : "PDF"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
