"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeIndicator } from "@/components/dashboard/change-indicator";
import { useStockFundamentals } from "@/hooks/useStockFundamentals";
import { formatMarketCap } from "@/lib/utils";
import { StockQuote } from "@/types";
import { Trash2 } from "lucide-react";

interface WatchlistTableProps {
  symbols: string[];
  onRemove: (symbol: string) => void;
  removingSymbol?: string;
}

export function WatchlistTable({
  symbols,
  onRemove,
  removingSymbol,
}: WatchlistTableProps) {
  // Fetch every quote together so the parent can sort rows by market cap.
  // Shares the ["stock-quote", symbol] cache used by useStockQuote.
  const results = useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: ["stock-quote", symbol],
      queryFn: async (): Promise<StockQuote | null> => {
        const res = await fetch(`/api/market/quote/${symbol}`);
        if (!res.ok) return null;
        return res.json();
      },
      staleTime: 30_000,
      refetchInterval: 30_000,
    })),
  });

  const rows = symbols
    .map((symbol, i) => ({
      symbol,
      quote: results[i].data ?? null,
      isLoading: results[i].isLoading,
    }))
    // Descending by market cap; rows still loading (no quote) sink to the bottom.
    .sort((a, b) => (b.quote?.marketCap ?? -1) - (a.quote?.marketCap ?? -1));

  return (
    <div className="rounded-lg border border-border/50 bg-card/50">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Symbol</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Day Change</TableHead>
            <TableHead className="text-right">P/E</TableHead>
            <TableHead className="text-right">Market Cap</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <WatchlistRow
              key={row.symbol}
              symbol={row.symbol}
              quote={row.quote}
              isLoading={row.isLoading}
              onRemove={onRemove}
              removing={removingSymbol === row.symbol}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function WatchlistRow({
  symbol,
  quote,
  isLoading,
  onRemove,
  removing,
}: {
  symbol: string;
  quote: StockQuote | null;
  isLoading: boolean;
  onRemove: (symbol: string) => void;
  removing?: boolean;
}) {
  const { data: fundamentals } = useStockFundamentals(symbol);
  const pe = fundamentals?.fundamentals?.peRatio;

  return (
    <TableRow className="transition-colors hover:bg-accent/50">
      <TableCell>
        <Link href={`/stock/${symbol}`} className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-xs font-bold">
            {symbol.slice(0, 2)}
          </div>
          <div>
            <p className="font-medium">{symbol}</p>
            <p className="max-w-[180px] truncate text-xs text-muted-foreground">
              {quote?.name ?? (isLoading ? "Loading…" : symbol)}
            </p>
          </div>
        </Link>
      </TableCell>
      <TableCell className="text-right font-mono">
        {isLoading ? (
          <Skeleton className="ml-auto h-4 w-16" />
        ) : quote ? (
          `$${quote.price.toFixed(2)}`
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-right">
        {quote ? (
          <ChangeIndicator
            value={quote.change}
            percentage={quote.changePercent}
            showIcon={false}
            size="xs"
            className="justify-end"
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {pe && pe > 0 ? pe.toFixed(1) : "—"}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {quote ? formatMarketCap(quote.marketCap) : "—"}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          disabled={removing}
          onClick={() => onRemove(symbol)}
          aria-label={`Remove ${symbol}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
