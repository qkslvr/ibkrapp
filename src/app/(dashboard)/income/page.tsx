"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Wallet, Calendar, TrendingUp, DollarSign } from "lucide-react";

interface DividendHolding {
  symbol: string;
  name: string;
  shares: number;
  yield: number;
  annualRate: number;
  annualIncome: number;
  lastExDate: string;
  estimatedNextExDate: string;
  estimatedNextAmount: number;
  ytdIncome: number;
}

interface IncomeData {
  holdings: DividendHolding[];
  summary: {
    ytdIncome: number;
    totalAnnualIncome: number;
    avgYield: number;
    monthlyAvg: number;
  };
  monthly: { month: string; income: number }[];
}

function useIncome() {
  return useQuery<IncomeData>({
    queryKey: ["income"],
    queryFn: async () => {
      const res = await fetch("/api/ibkr/income");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 10 * 60_000,
  });
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-secondary/50 ${className}`} />;
}

function fmt(date: string) {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

export default function IncomePage() {
  const { data, isLoading } = useIncome();

  const maxMonthly = Math.max(...(data?.monthly.map((m) => m.income) ?? [1]), 1);
  const upcomingDivs = data?.holdings
    .map((h) => ({ symbol: h.symbol, date: h.estimatedNextExDate, amount: h.estimatedNextAmount }))
    .sort((a, b) => a.date.localeCompare(b.date)) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dividend Income</h1>
        <p className="text-muted-foreground">Track your passive income from dividends</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: DollarSign, label: "YTD Income", value: isLoading ? null : `$${data!.summary.ytdIncome.toLocaleString()}` },
          { icon: TrendingUp, label: "Projected Annual", value: isLoading ? null : `$${data!.summary.totalAnnualIncome.toLocaleString()}` },
          { icon: Wallet, label: "Avg Portfolio Yield", value: isLoading ? null : `${data!.summary.avgYield.toFixed(2)}%` },
          { icon: Calendar, label: "Monthly Avg", value: isLoading ? null : `$${data!.summary.monthlyAvg.toFixed(2)}` },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="border-border/50 bg-card/50 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span className="text-sm">{label}</span>
            </div>
            {isLoading
              ? <Skeleton className="mt-2 h-8 w-28" />
              : <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>}
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming Dividends */}
        <Card className="border-border/50 bg-card/50 p-6 lg:col-span-1">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Upcoming Dividends (estimated)
          </h3>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : upcomingDivs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming dividends found</p>
          ) : (
            <div className="space-y-3">
              {upcomingDivs.map((d) => (
                <div key={d.symbol} className="flex items-center justify-between rounded-lg bg-secondary/30 p-3">
                  <div>
                    <p className="font-medium">{d.symbol}</p>
                    <p className="text-xs text-muted-foreground">Ex: ~{fmt(d.date)}</p>
                  </div>
                  <p className="font-mono font-medium text-[oklch(0.72_0.19_145)]">
                    +${d.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Monthly Income Chart */}
        <Card className="border-border/50 bg-card/50 p-6 lg:col-span-2">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">Monthly Dividend Income</h3>
          {isLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="flex h-48 items-end gap-1.5">
              {data!.monthly.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  {m.income > 0 && (
                    <span className="text-xs font-mono text-[oklch(0.72_0.19_145)]">
                      ${m.income.toFixed(0)}
                    </span>
                  )}
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t transition-all ${m.income > 0 ? "bg-[oklch(0.72_0.19_145)]/80" : "bg-secondary/50"}`}
                      style={{ height: `${Math.max((m.income / maxMonthly) * 100, m.income > 0 ? 8 : 4)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{m.month}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Dividend Holdings Table */}
      <Card className="border-border/50 bg-card/50">
        <div className="border-b border-border/50 p-4">
          <h3 className="font-medium">Dividend-Paying Holdings</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            AMD and CDNS do not pay dividends and are excluded
          </p>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Yield</TableHead>
                <TableHead className="text-right">Div/Share (Annual)</TableHead>
                <TableHead className="text-right">Annual Income</TableHead>
                <TableHead className="text-right">YTD Received</TableHead>
                <TableHead className="text-right">Last Ex-Date</TableHead>
                <TableHead className="text-right">Next Ex-Date (est.)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.holdings.map((h) => (
                <TableRow key={h.symbol}>
                  <TableCell>
                    <p className="font-medium">{h.symbol}</p>
                    <p className="text-xs text-muted-foreground">{h.name}</p>
                  </TableCell>
                  <TableCell className="text-right font-mono">{h.shares.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{h.yield.toFixed(2)}%</TableCell>
                  <TableCell className="text-right font-mono">${h.annualRate.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono font-medium text-[oklch(0.72_0.19_145)]">
                    ${h.annualIncome.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[oklch(0.72_0.19_145)]">
                    ${h.ytdIncome.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {fmt(h.lastExDate)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    ~{fmt(h.estimatedNextExDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-secondary/30 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell className="text-right font-mono text-[oklch(0.72_0.19_145)]">
                  ${data!.summary.totalAnnualIncome.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono text-[oklch(0.72_0.19_145)]">
                  ${data!.summary.ytdIncome.toFixed(2)}
                </TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </Card>
    </div>
  );
}
