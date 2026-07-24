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
import { ChangeIndicator } from "./change-indicator";
import { StockLogo } from "@/components/ui/stock-logo";
import { Position } from "@/types";
import { cn, formatMarketCap } from "@/lib/utils";
import { Search, ArrowUpDown } from "lucide-react";

interface HoldingsTableProps {
  positions: Position[];
  // When provided, weights are shown as a share of the WHOLE portfolio
  // (securities + cash), not just the securities sleeve.
  totalPortfolioValue?: number;
}

type SortKey = keyof Position;
type SortOrder = "asc" | "desc";

export function HoldingsTable({ positions, totalPortfolioValue }: HoldingsTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("marketValue");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const weightOf = (p: Position) =>
    totalPortfolioValue && totalPortfolioValue > 0
      ? (Math.abs(p.marketValue) / totalPortfolioValue) * 100
      : p.weight;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const totals = {
    costBasis: positions.reduce((s, p) => s + p.costBasis, 0),
    marketValue: positions.reduce((s, p) => s + p.marketValue, 0),
    dayChange: positions.reduce((s, p) => s + p.dayChange, 0),
    dayChangePercent: (() => {
      const mv = positions.reduce((s, p) => s + p.marketValue, 0);
      const dc = positions.reduce((s, p) => s + p.dayChange, 0);
      const prev = mv - dc;
      return prev !== 0 ? (dc / prev) * 100 : 0;
    })(),
    unrealizedPL: positions.reduce((s, p) => s + p.unrealizedPL, 0),
    unrealizedPLPercent: positions.reduce((s, p) => s + p.unrealizedPL, 0) /
      positions.reduce((s, p) => s + p.costBasis, 0) * 100,
    weight: positions.reduce((s, p) => s + weightOf(p), 0),
  };

  const filteredPositions = positions
    .filter(
      (p) =>
        p.symbol.toLowerCase().includes(search.toLowerCase()) ||
        p.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  const SortableHeader = ({
    label,
    sortKeyName,
    className,
  }: {
    label: string;
    sortKeyName: SortKey;
    className?: string;
  }) => (
    <TableHead
      className={cn("cursor-pointer select-none hover:text-foreground", className)}
      onClick={() => handleSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search holdings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 bg-secondary/50 pl-9 text-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/50 bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 text-right">#</TableHead>
              <SortableHeader label="Symbol" sortKeyName="symbol" />
              <SortableHeader label="Shares" sortKeyName="shares" className="text-right" />
              <SortableHeader label="Avg Price" sortKeyName="avgCost" className="text-right" />
              <SortableHeader label="Current Price" sortKeyName="currentPrice" className="text-right" />
              <SortableHeader label="Invested" sortKeyName="costBasis" className="text-right" />
              <SortableHeader label="Current Value" sortKeyName="marketValue" className="text-right" />
              <SortableHeader label="Today" sortKeyName="dayChange" className="text-right" />
              <SortableHeader label="Total Return" sortKeyName="unrealizedPL" className="text-right" />
              <SortableHeader label="Total Return%" sortKeyName="unrealizedPLPercent" className="text-right" />
              <SortableHeader label="Weight" sortKeyName="weight" className="text-right" />
              <SortableHeader label="Market Cap" sortKeyName="marketCap" className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPositions.map((position, index) => (
              <TableRow
                key={position.symbol}
                className="cursor-pointer transition-colors hover:bg-accent/50"
              >
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/stock/${position.symbol}`}
                    className="flex items-center gap-3"
                  >
                    <StockLogo symbol={position.symbol} size={32} className="h-8 w-8 shrink-0" />
                    <div>
                      <p className="font-medium">{position.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        {position.name}
                      </p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {position.shares.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </TableCell>
                <TableCell className="text-right font-mono">
                  ${position.avgCost.toFixed(0)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  ${position.currentPrice.toFixed(0)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  ${position.costBasis.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </TableCell>
                <TableCell className="text-right font-mono font-medium">
                  ${position.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </TableCell>
                <TableCell className="text-right">
                  <ChangeIndicator
                    value={position.dayChange}
                    percentage={position.dayChangePercent}
                    showIcon={false}
                    showValue={false}
                    size="xs"
                    fractionDigits={0}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <ChangeIndicator
                    value={position.unrealizedPL}
                    showIcon={false}
                    showPercentage={false}
                    size="xs"
                    fractionDigits={0}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <ChangeIndicator
                    value={position.unrealizedPL}
                    percentage={position.unrealizedPLPercent}
                    showIcon={false}
                    showValue={false}
                    size="xs"
                    fractionDigits={0}
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {weightOf(position).toFixed(1)}%
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatMarketCap(position.marketCap ?? 0)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="border-t border-border/50 bg-secondary/30 hover:bg-secondary/40 font-semibold">
              <TableCell />
              <TableCell className="text-muted-foreground text-xs uppercase tracking-wide">
                Total
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell className="text-right font-mono font-semibold">
                ${totals.costBasis.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                ${totals.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </TableCell>
              <TableCell className="text-right">
                <ChangeIndicator
                  value={totals.dayChange}
                  percentage={totals.dayChangePercent}
                  showIcon={false}
                  showValue={false}
                  size="xs"
                  fractionDigits={0}
                />
              </TableCell>
              <TableCell className="text-right">
                <ChangeIndicator
                  value={totals.unrealizedPL}
                  showIcon={false}
                  showPercentage={false}
                  size="xs"
                  fractionDigits={0}
                />
              </TableCell>
              <TableCell className="text-right">
                <ChangeIndicator
                  value={totals.unrealizedPL}
                  percentage={totals.unrealizedPLPercent}
                  showIcon={false}
                  showValue={false}
                  size="xs"
                  fractionDigits={0}
                />
              </TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
