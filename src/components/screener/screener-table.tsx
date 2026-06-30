"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScreenerStock } from "@/types";
import { cn, formatMarketCap } from "@/lib/utils";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

const POSITIVE = "text-[oklch(0.72_0.19_145)]";
const NEGATIVE = "text-[oklch(0.65_0.22_25)]";

type Align = "left" | "right";
interface Column {
  key: keyof ScreenerStock;
  label: string;
  align: Align;
  highlight?: boolean; // the QoQ growth focus columns
  render: (s: ScreenerStock) => React.ReactNode;
}

function pct(n: number | null) {
  if (n == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={n > 0 ? POSITIVE : n < 0 ? NEGATIVE : undefined}>
      {n > 0 ? "+" : ""}
      {n.toFixed(2)}%
    </span>
  );
}
function dec(n: number | null, digits = 2) {
  return n == null ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    n.toFixed(digits)
  );
}

const COLUMNS: Column[] = [
  {
    key: "ticker",
    label: "Ticker",
    align: "left",
    render: (s) => (
      <Link
        href={`/stock/${s.ticker}`}
        className="font-mono font-semibold text-primary hover:underline"
      >
        {s.ticker}
      </Link>
    ),
  },
  {
    key: "company",
    label: "Company",
    align: "left",
    render: (s) => (
      <span className="block max-w-[200px] truncate text-muted-foreground">
        {s.company}
      </span>
    ),
  },
  { key: "marketCap", label: "Mkt Cap", align: "right", render: (s) => formatMarketCap(s.marketCap ?? 0) },
  { key: "pe", label: "P/E", align: "right", render: (s) => dec(s.pe) },
  {
    key: "epsGrowthQoQ",
    label: "EPS QoQ",
    align: "right",
    highlight: true,
    render: (s) => pct(s.epsGrowthQoQ),
  },
  {
    key: "salesGrowthQoQ",
    label: "Rev QoQ",
    align: "right",
    highlight: true,
    render: (s) => pct(s.salesGrowthQoQ),
  },
  { key: "epsGrowthThisYear", label: "EPS Gr (Y)", align: "right", render: (s) => pct(s.epsGrowthThisYear) },
  { key: "salesGrowthPast5Y", label: "Rev Gr 5Y", align: "right", render: (s) => pct(s.salesGrowthPast5Y) },
  { key: "profitMargin", label: "Margin", align: "right", render: (s) => pct(s.profitMargin) },
  { key: "roe", label: "ROE", align: "right", render: (s) => pct(s.roe) },
  { key: "perfQuarter", label: "Perf Q", align: "right", render: (s) => pct(s.perfQuarter) },
  {
    key: "price",
    label: "Price",
    align: "right",
    render: (s) => (s.price == null ? "—" : `$${s.price.toFixed(2)}`),
  },
  { key: "change", label: "Chg", align: "right", render: (s) => pct(s.change) },
];

export function ScreenerTable({ stocks }: { stocks: ScreenerStock[] }) {
  const [sortKey, setSortKey] = useState<keyof ScreenerStock>("marketCap");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const rows = [...stocks];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // Nulls/blanks always sink to the bottom regardless of direction.
      const aNull = av == null || av === "";
      const bNull = bv == null || bv === "";
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      let cmp: number;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        cmp = (av as number) - (bv as number);
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [stocks, sortKey, dir]);

  function toggleSort(key: keyof ScreenerStock) {
    if (key === sortKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Strings default A→Z; numbers default high→low.
      setDir(typeof stocks[0]?.[key] === "string" ? "asc" : "desc");
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/50">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((c) => {
              const isSorted = c.key === sortKey;
              return (
                <TableHead
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className={cn(
                    "cursor-pointer select-none whitespace-nowrap",
                    c.align === "right" && "text-right",
                    c.highlight && "bg-primary/5 text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      c.align === "right" && "flex-row-reverse"
                    )}
                  >
                    {c.label}
                    {isSorted ? (
                      dir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </span>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((s) => (
            <TableRow key={s.ticker}>
              {COLUMNS.map((c) => (
                <TableCell
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap",
                    c.align === "right" && "text-right tabular-nums",
                    c.highlight && "bg-primary/5"
                  )}
                >
                  {c.render(s)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
