"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { StockLogo } from "@/components/ui/stock-logo";
import { Position } from "@/types";
import { cn, formatMarketCap } from "@/lib/utils";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface HoldingsTableProps {
  positions: Position[];
  // When provided, weights are shown as a share of the WHOLE portfolio
  // (securities + cash), not just the securities sleeve.
  totalPortfolioValue?: number;
}

type SortKey = keyof Position;
type SortOrder = "asc" | "desc";

const GAIN = "oklch(0.74 0.19 150)";
const LOSS = "oklch(0.66 0.21 22)";

function money0(n: number) {
  return "$" + Math.round(n).toLocaleString();
}
function signedMoney0(n: number) {
  return (n < 0 ? "-$" : "+$") + Math.round(Math.abs(n)).toLocaleString();
}
function pctStr(n: number) {
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

export function HoldingsTable({ positions, totalPortfolioValue }: HoldingsTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("marketValue");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const weightOf = (p: Position) =>
    totalPortfolioValue && totalPortfolioValue > 0
      ? (Math.abs(p.marketValue) / totalPortfolioValue) * 100
      : p.weight;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const totals = {
    costBasis: positions.reduce((s, p) => s + p.costBasis, 0),
    marketValue: positions.reduce((s, p) => s + p.marketValue, 0),
    dayChange: positions.reduce((s, p) => s + p.dayChange, 0),
    unrealizedPL: positions.reduce((s, p) => s + p.unrealizedPL, 0),
  };
  const totalDayPct = (() => {
    const prev = totals.marketValue - totals.dayChange;
    return prev !== 0 ? (totals.dayChange / prev) * 100 : 0;
  })();
  const totalReturnPct = totals.costBasis !== 0 ? (totals.unrealizedPL / totals.costBasis) * 100 : 0;
  const totalWeight = positions.reduce((s, p) => s + weightOf(p), 0);

  const filtered = positions
    .filter(
      (p) =>
        p.symbol.toLowerCase().includes(search.toLowerCase()) ||
        p.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === "number" && typeof bVal === "number")
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      return sortOrder === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  const maxWeight = Math.max(...filtered.map(weightOf), 0.0001);

  const SortableHeader = ({
    label,
    sortKeyName,
    align = "right",
  }: {
    label: string;
    sortKeyName: SortKey;
    align?: "left" | "right";
  }) => {
    const active = sortKey === sortKeyName;
    return (
      <TableHead
        className={cn(
          "cursor-pointer select-none whitespace-nowrap text-xs uppercase tracking-wide transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
          align === "right" && "text-right",
        )}
        onClick={() => handleSort(sortKeyName)}
      >
        <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
          {label}
          {active ? (
            sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </span>
      </TableHead>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search holdings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 bg-secondary/50 pl-9 text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/50">
        <Table className="[&_td]:py-2.5">
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="w-8 pl-4 text-right text-xs text-muted-foreground">#</TableHead>
              <SortableHeader label="Symbol" sortKeyName="symbol" align="left" />
              <SortableHeader label="Shares" sortKeyName="shares" />
              <SortableHeader label="Price" sortKeyName="currentPrice" />
              <SortableHeader label="Invested" sortKeyName="costBasis" />
              <SortableHeader label="Value" sortKeyName="marketValue" />
              <SortableHeader label="Today" sortKeyName="dayChangePercent" />
              {/* Total Return with $ / % sort toggle */}
              <TableHead className="whitespace-nowrap text-right text-xs uppercase tracking-wide text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  Total Return
                  <span className="inline-flex overflow-hidden rounded-md border border-border/60">
                    {(["unrealizedPL", "unrealizedPLPercent"] as const).map((k, i) => (
                      <button
                        key={k}
                        onClick={() => handleSort(k)}
                        className={cn(
                          "px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                          i === 1 && "border-l border-border/60",
                          sortKey === k
                            ? "bg-primary/20 text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {k === "unrealizedPL" ? "$" : "%"}
                        {sortKey === k && (sortOrder === "asc" ? " ↑" : " ↓")}
                      </button>
                    ))}
                  </span>
                </span>
              </TableHead>
              <SortableHeader label="Weight" sortKeyName="weight" />
              <SortableHeader label="Mkt Cap" sortKeyName="marketCap" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p, index) => {
              const dayUp = p.dayChangePercent >= 0;
              const retUp = p.unrealizedPL >= 0;
              const w = weightOf(p);
              return (
                <TableRow
                  key={p.symbol}
                  className="group border-border/40 transition-colors hover:bg-accent/40"
                >
                  <TableCell className="pl-4 text-right font-mono text-xs text-muted-foreground/70">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <Link href={`/stock/${p.symbol}`} className="flex items-center gap-3">
                      <StockLogo symbol={p.symbol} size={32} className="h-8 w-8 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight">{p.symbol}</p>
                        <p className="max-w-[150px] truncate text-xs text-muted-foreground">{p.name}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {p.shares.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-mono tabular-nums">
                      {money0(p.currentPrice)}
                      {p.marketCap != null && (
                        <span className="text-xs text-muted-foreground/60"> ({formatMarketCap(p.marketCap)})</span>
                      )}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      avg {money0(p.avgCost)}
                      {p.marketCap != null && p.currentPrice > 0 && (
                        <span className="text-muted-foreground/60">
                          {" "}({formatMarketCap(p.marketCap * (p.avgCost / p.currentPrice))})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {money0(p.costBasis)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium tabular-nums">
                    {money0(p.marketValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className="inline-flex rounded-md px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums"
                      style={{
                        color: dayUp ? GAIN : LOSS,
                        backgroundColor: (dayUp ? GAIN : LOSS).replace(")", " / 0.12)"),
                      }}
                    >
                      {pctStr(p.dayChangePercent)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-mono text-sm tabular-nums" style={{ color: retUp ? GAIN : LOSS }}>
                      {signedMoney0(p.unrealizedPL)}
                    </div>
                    <div className="font-mono text-xs tabular-nums text-muted-foreground">
                      {pctStr(p.unrealizedPLPercent)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-secondary sm:block">
                        <div
                          className="h-full rounded-full bg-primary/80"
                          style={{ width: `${Math.min((w / maxWeight) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm tabular-nums">{w.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-4 text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {formatMarketCap(p.marketCap ?? 0)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="border-t border-border/60 bg-secondary/20 font-semibold hover:bg-secondary/30">
              <TableCell />
              <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">Total</TableCell>
              <TableCell />
              <TableCell />
              <TableCell className="text-right font-mono tabular-nums">{money0(totals.costBasis)}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{money0(totals.marketValue)}</TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums" style={{ color: totalDayPct >= 0 ? GAIN : LOSS }}>
                {pctStr(totalDayPct)}
              </TableCell>
              <TableCell className="text-right">
                <div className="font-mono text-sm tabular-nums" style={{ color: totals.unrealizedPL >= 0 ? GAIN : LOSS }}>
                  {signedMoney0(totals.unrealizedPL)}
                </div>
                <div className="font-mono text-xs tabular-nums text-muted-foreground">{pctStr(totalReturnPct)}</div>
              </TableCell>
              <TableCell className="pr-0 text-right font-mono text-sm tabular-nums">{totalWeight.toFixed(1)}%</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
