"use client";

import { Card } from "@/components/ui/card";
import { ChangeIndicator } from "./change-indicator";
import { TopMover } from "@/types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TopMoversProps {
  gainers: TopMover[];
  losers: TopMover[];
}

export function TopMovers({ gainers, losers }: TopMoversProps) {
  return (
    <Card className="border-border/50 bg-card/50 p-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        Today&apos;s Movers
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-4">
        {/* Top Gainer */}
        <div className="rounded-lg bg-[oklch(0.72_0.19_145_/_0.1)] p-3">
          <div className="flex items-center gap-2 text-xs text-[oklch(0.72_0.19_145)]">
            <TrendingUp className="h-3 w-3" />
            <span>Top Gainer</span>
          </div>
          {gainers[0] && (
            <div className="mt-2">
              <p className="font-medium">{gainers[0].symbol}</p>
              <p className="text-xs text-muted-foreground">{gainers[0].name}</p>
              <ChangeIndicator
                value={gainers[0].change}
                percentage={gainers[0].changePercent}
                showIcon={false}
                className="mt-1"
                size="xs"
              />
            </div>
          )}
        </div>

        {/* Top Loser */}
        <div className="rounded-lg bg-[oklch(0.65_0.22_25_/_0.1)] p-3">
          <div className="flex items-center gap-2 text-xs text-[oklch(0.65_0.22_25)]">
            <TrendingDown className="h-3 w-3" />
            <span>Top Loser</span>
          </div>
          {losers[0] && (
            <div className="mt-2">
              <p className="font-medium">{losers[0].symbol}</p>
              <p className="text-xs text-muted-foreground">{losers[0].name}</p>
              <ChangeIndicator
                value={losers[0].change}
                percentage={losers[0].changePercent}
                showIcon={false}
                className="mt-1"
                size="xs"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
