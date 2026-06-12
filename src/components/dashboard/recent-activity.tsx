"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/types";
import { History, ArrowUpRight, ArrowDownRight, Coins } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface RecentActivityProps {
  transactions: Transaction[];
}

const typeConfig = {
  BUY: {
    icon: ArrowUpRight,
    color: "text-[oklch(0.72_0.19_145)]",
    bgColor: "bg-[oklch(0.72_0.19_145_/_0.1)]",
    label: "Buy",
  },
  SELL: {
    icon: ArrowDownRight,
    color: "text-[oklch(0.65_0.22_25)]",
    bgColor: "bg-[oklch(0.65_0.22_25_/_0.1)]",
    label: "Sell",
  },
  DIVIDEND: {
    icon: Coins,
    color: "text-[oklch(0.7_0.15_250)]",
    bgColor: "bg-[oklch(0.7_0.15_250_/_0.1)]",
    label: "Dividend",
  },
  TRANSFER: {
    icon: History,
    color: "text-muted-foreground",
    bgColor: "bg-secondary",
    label: "Transfer",
  },
};

export function RecentActivity({ transactions }: RecentActivityProps) {
  return (
    <Card className="border-border/50 bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Recent Activity
          </h3>
        </div>
        <Link
          href="/transactions"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          View all
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {transactions.slice(0, 5).map((tx) => {
          const config = typeConfig[tx.type];
          const Icon = config.icon;

          return (
            <div
              key={tx.id}
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50"
            >
              <div className={cn("rounded-lg p-2", config.bgColor)}>
                <Icon className={cn("h-4 w-4", config.color)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tx.symbol}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {config.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tx.type === "DIVIDEND"
                    ? `${tx.shares} shares`
                    : `${tx.shares} @ $${tx.price.toFixed(2)}`}
                </p>
              </div>

              <div className="text-right">
                <p
                  className={cn(
                    "font-mono text-sm font-medium",
                    tx.type === "SELL"
                      ? "text-[oklch(0.72_0.19_145)]"
                      : tx.type === "BUY"
                      ? "text-foreground"
                      : "text-[oklch(0.72_0.19_145)]"
                  )}
                >
                  {tx.type === "BUY" ? "-" : "+"}${Math.abs(tx.total).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(tx.date), "MMM d")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
