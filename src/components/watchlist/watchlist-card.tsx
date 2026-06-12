"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeIndicator } from "@/components/dashboard/change-indicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStockQuote } from "@/hooks/useStockQuote";
import { useStockFundamentals } from "@/hooks/useStockFundamentals";
import { formatMarketCap } from "@/lib/utils";
import { MoreHorizontal, Trash2 } from "lucide-react";

interface WatchlistCardProps {
  symbol: string;
  onRemove: (symbol: string) => void;
  removing?: boolean;
}

export function WatchlistCard({ symbol, onRemove, removing }: WatchlistCardProps) {
  const { data: quote, isLoading } = useStockQuote(symbol);
  const { data: fundamentals } = useStockFundamentals(symbol);
  const pe = fundamentals?.fundamentals?.peRatio;

  return (
    <Card className="border-border/50 bg-card/50 p-4 transition-all hover:bg-accent/30">
      <div className="flex items-start justify-between">
        <Link href={`/stock/${symbol}`} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-sm font-bold">
            {symbol.slice(0, 2)}
          </div>
          <div>
            <span className="font-medium">{symbol}</span>
            <p className="max-w-[160px] truncate text-xs text-muted-foreground">
              {quote?.name ?? (isLoading ? "Loading…" : symbol)}
            </p>
          </div>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              disabled={removing}
              onClick={() => onRemove(symbol)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : quote ? (
            <p className="font-mono text-2xl font-semibold">
              ${quote.price.toFixed(2)}
            </p>
          ) : (
            <p className="font-mono text-2xl font-semibold text-muted-foreground">—</p>
          )}
          {quote && (
            <ChangeIndicator
              value={quote.change}
              percentage={quote.changePercent}
              className="mt-1"
              size="sm"
            />
          )}
        </div>

        <div className="text-right text-sm">
          <div className="text-muted-foreground">
            P/E: <span className="font-mono">{pe && pe > 0 ? pe.toFixed(1) : "—"}</span>
          </div>
          <div className="text-muted-foreground">
            MCap:{" "}
            <span className="font-mono">
              {quote ? formatMarketCap(quote.marketCap) : "—"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
