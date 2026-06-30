"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TickerSearch } from "@/components/screener/ticker-search";
import { ScreenerTable } from "@/components/screener/screener-table";
import { useScreener, ScreenerIndex } from "@/hooks/useScreener";

const INDEXES: { value: ScreenerIndex; label: string }[] = [
  { value: "sp500", label: "S&P 500" },
  { value: "ndx", label: "NASDAQ 100" },
  { value: "dji", label: "Dow 30" },
  { value: "all", label: "All" },
];

// "All" is ~11k tickers; cap rendered rows to the largest companies by market
// cap for performance. The table re-sorts this subset on demand.
const MAX_ROWS = 500;

export default function ScreenerPage() {
  const [index, setIndex] = useState<ScreenerIndex>("sp500");
  const { data, isLoading, isError } = useScreener(index);
  const stocks = data?.stocks ?? [];
  const shown =
    stocks.length > MAX_ROWS
      ? [...stocks]
          .sort((a, b) => (b.marketCap ?? -1) - (a.marketCap ?? -1))
          .slice(0, MAX_ROWS)
      : stocks;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Stock Screener</h1>
        <p className="text-muted-foreground">
          Quarter-over-quarter EPS &amp; revenue growth and key fundamentals,
          powered by Finviz. Click any column to sort.
        </p>
      </div>

      {/* Ticker searcher */}
      <TickerSearch />

      {/* Index selector */}
      <Tabs value={index} onValueChange={(v) => setIndex(v as ScreenerIndex)}>
        <TabsList>
          {INDEXES.map((i) => (
            <TabsTrigger key={i.value} value={i.value}>
              {i.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : isError || stocks.length === 0 ? (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">
            No screener data available. Check that{" "}
            <code className="rounded bg-muted px-1 py-0.5">FINVIZ_API_KEY</code>{" "}
            is set on the server.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {stocks.length > MAX_ROWS
              ? `Showing top ${MAX_ROWS} of ${stocks.length} stocks`
              : `${stocks.length} stocks`}
          </p>
          <ScreenerTable stocks={shown} />
        </div>
      )}
    </div>
  );
}
