"use client";

import { Card } from "@/components/ui/card";
import { DividendInfo } from "@/types";
import { Wallet, Calendar } from "lucide-react";
import { format } from "date-fns";

interface DividendsWidgetProps {
  data: DividendInfo;
}

export function DividendsWidget({ data }: DividendsWidgetProps) {
  return (
    <Card className="border-border/50 bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Dividend Income
        </h3>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">YTD Income</p>
          <p className="mt-1 font-mono text-lg font-semibold">
            ${data.ytdIncome.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Projected Annual</p>
          <p className="mt-1 font-mono text-lg font-semibold">
            ${data.projectedAnnual.toLocaleString()}
          </p>
        </div>
      </div>

      {data.nextDividend && data.nextDividend.amount > 0 && (
        <div className="mt-4 rounded-lg bg-secondary/50 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Next Dividend</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="font-medium">{data.nextDividend.symbol}</p>
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const d = new Date(data.nextDividend.exDate);
                  return isNaN(d.getTime()) ? data.nextDividend.exDate : `Ex: ${format(d, "MMM d")}`;
                })()}
              </p>
            </div>
            <p className="font-mono text-sm font-medium text-[oklch(0.72_0.19_145)]">
              +${data.nextDividend.amount.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
        <span className="text-xs text-muted-foreground">Portfolio Yield</span>
        <span className="font-mono text-sm font-medium">
          {data.portfolioYield.toFixed(2)}%
        </span>
      </div>
    </Card>
  );
}
