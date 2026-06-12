"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { WatchlistCard } from "@/components/watchlist/watchlist-card";
import { AddStockDialog } from "@/components/watchlist/add-stock-dialog";
import {
  useWatchlist,
  useRemoveFromWatchlist,
} from "@/hooks/useWatchlist";
import { Search } from "lucide-react";

export default function WatchlistPage() {
  const [search, setSearch] = useState("");
  const { data: symbols = [], isLoading } = useWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  const filtered = symbols.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Watchlist</h1>
          <p className="text-muted-foreground">
            Track stocks you&apos;re interested in
          </p>
        </div>
        <AddStockDialog existing={symbols} />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search watchlist..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[132px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((symbol) => (
            <WatchlistCard
              key={symbol}
              symbol={symbol}
              onRemove={(s) => removeFromWatchlist.mutate(s)}
              removing={
                removeFromWatchlist.isPending &&
                removeFromWatchlist.variables === symbol
              }
            />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card className="border-border/50 bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">
            {symbols.length === 0
              ? "No stocks in your watchlist"
              : "No stocks match your search"}
          </p>
          {symbols.length === 0 && (
            <div className="mt-4 flex justify-center">
              <AddStockDialog existing={symbols} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
