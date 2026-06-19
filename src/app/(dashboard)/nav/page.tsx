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
} from "recharts";
import { useNAV } from "@/hooks/useNAV";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Users, BarChart3 } from "lucide-react";

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCurrency(n: number) {
  return "$" + fmt(n);
}

export default function NAVPage() {
  const { data: nav, isLoading } = useNAV();

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

  const chartData = nav.monthly.map((m) => ({
    label: format(parseISO(m.month + "-01"), "MMM yy"),
    nav: +m.nav.toFixed(4),
    portfolioValue: m.portfolioValue,
  }));

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

      {/* NAV Chart */}
      {chartData.length > 1 && (
        <Card className="border-border/50 bg-card/50 p-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">NAV per Unit — Monthly</h2>
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
                stroke="oklch(0.72_0.19_145)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Deposit / Units Ledger */}
      <Card className="border-border/50 bg-card/50">
        <div className="border-b border-border/50 px-6 py-4">
          <h2 className="text-sm font-medium">Capital Subscriptions &amp; Units Issued</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Each deposit is converted to units at the NAV on the date of subscription</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount Invested</TableHead>
              <TableHead className="text-right">NAV at Subscription</TableHead>
              <TableHead className="text-right">Units Issued</TableHead>
              <TableHead className="text-right">Current Value</TableHead>
              <TableHead className="text-right">Return</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nav.deposits.map((dep, i) => {
              const currentValue = dep.unitsIssued * nav.currentNAV;
              const returnPct = ((nav.currentNAV - dep.navAtDeposit) / dep.navAtDeposit) * 100;
              return (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground">
                    {format(parseISO(dep.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right font-mono">{fmtCurrency(dep.amount)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtCurrency(dep.navAtDeposit)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(dep.unitsIssued, 4)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtCurrency(currentValue)}</TableCell>
                  <TableCell className={cn("text-right font-mono text-sm", returnPct >= 0 ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]")}>
                    {returnPct >= 0 ? "+" : ""}{fmt(returnPct)}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Monthly NAV Table */}
      <Card className="border-border/50 bg-card/50">
        <div className="border-b border-border/50 px-6 py-4">
          <h2 className="text-sm font-medium">Monthly NAV Report</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Portfolio Value</TableHead>
              <TableHead className="text-right">Units Outstanding</TableHead>
              <TableHead className="text-right">NAV / Unit</TableHead>
              <TableHead className="text-right">Return vs Base</TableHead>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
