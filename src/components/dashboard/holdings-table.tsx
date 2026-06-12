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
import { Badge } from "@/components/ui/badge";
import { ChangeIndicator } from "./change-indicator";
import { Position } from "@/types";
import { cn } from "@/lib/utils";
import { Search, ArrowUpDown } from "lucide-react";

interface HoldingsTableProps {
  positions: Position[];
}

type SortKey = keyof Position;
type SortOrder = "asc" | "desc";

export function HoldingsTable({ positions }: HoldingsTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("marketValue");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

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
    unrealizedPL: positions.reduce((s, p) => s + p.unrealizedPL, 0),
    unrealizedPLPercent: positions.reduce((s, p) => s + p.unrealizedPL, 0) /
      positions.reduce((s, p) => s + p.costBasis, 0) * 100,
    weight: positions.reduce((s, p) => s + p.weight, 0),
  };

  const filteredPositions = positions
    .filter(
      (p) =>
        p.symbol.toLowerCase().includes(search.toLowerCase()) ||
        p.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
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
              <SortableHeader label="Symbol" sortKeyName="symbol" />
              <SortableHeader label="Shares" sortKeyName="shares" className="text-right" />
              <SortableHeader label="Avg Price" sortKeyName="avgCost" className="text-right" />
              <SortableHeader label="Current Price" sortKeyName="currentPrice" className="text-right" />
              <SortableHeader label="Invested" sortKeyName="costBasis" className="text-right" />
              <SortableHeader label="Current Value" sortKeyName="marketValue" className="text-right" />
              <SortableHeader label="Total Return" sortKeyName="unrealizedPL" className="text-right" />
              <SortableHeader label="Total Return%" sortKeyName="unrealizedPLPercent" className="text-right" />
              <SortableHeader label="Weight" sortKeyName="weight" className="text-right" />
              <TableHead>Sector</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPositions.map((position) => (
              <TableRow
                key={position.symbol}
                className="cursor-pointer transition-colors hover:bg-accent/50"
              >
                <TableCell>
                  <Link
                    href={`/stock/${position.symbol}`}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-xs font-bold">
                      {position.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium">{position.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        {position.name}
                      </p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {position.shares.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono">
                  ${position.avgCost.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  ${position.currentPrice.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  ${position.costBasis.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono font-medium">
                  ${position.marketValue.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <ChangeIndicator
                    value={position.unrealizedPL}
                    showIcon={false}
                    showPercentage={false}
                    size="xs"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <ChangeIndicator
                    value={position.unrealizedPL}
                    percentage={position.unrealizedPLPercent}
                    showIcon={false}
                    showValue={false}
                    size="xs"
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {position.weight.toFixed(1)}%
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {position.sector}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="border-t border-border/50 bg-secondary/30 hover:bg-secondary/40 font-semibold">
              <TableCell className="text-muted-foreground text-xs uppercase tracking-wide">
                Total
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell className="text-right font-mono font-semibold">
                ${totals.costBasis.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                ${totals.marketValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right">
                <ChangeIndicator
                  value={totals.unrealizedPL}
                  showIcon={false}
                  showPercentage={false}
                  size="xs"
                />
              </TableCell>
              <TableCell className="text-right">
                <ChangeIndicator
                  value={totals.unrealizedPL}
                  percentage={totals.unrealizedPLPercent}
                  showIcon={false}
                  showValue={false}
                  size="xs"
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
