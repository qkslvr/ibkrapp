"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/types";
import { ListChecks, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface OpenOrdersProps {
  orders: Order[];
}

export function OpenOrders({ orders }: OpenOrdersProps) {
  return (
    <Card className="border-border/50 bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">Open Orders</h3>
        </div>
        {orders.length > 0 && (
          <span className="text-xs text-muted-foreground">{orders.length} working</span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center gap-1 py-8 text-center">
          <ListChecks className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No open orders</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {orders.slice(0, 6).map((o) => {
            const isBuy = o.side === "BUY";
            const Icon = isBuy ? ArrowUpRight : ArrowDownRight;
            const color = isBuy ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]";
            const bg = isBuy ? "bg-[oklch(0.72_0.19_145_/_0.1)]" : "bg-[oklch(0.65_0.22_25_/_0.1)]";
            const notional = o.price != null ? o.quantity * o.price : null;
            return (
              <div
                key={o.id}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50"
              >
                <div className={cn("rounded-lg p-2", bg)}>
                  <Icon className={cn("h-4 w-4", color)} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{o.symbol}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {isBuy ? "Buy" : "Sell"}
                    </Badge>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      {o.orderType}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {o.filled > 0 ? `${o.remaining}/${o.quantity}` : o.quantity} @{" "}
                    {o.price != null ? `$${o.price.toFixed(2)}` : "MKT"}
                  </p>
                </div>

                <div className="text-right">
                  <p className={cn("font-mono text-sm font-medium", color)}>
                    {notional != null
                      ? `${isBuy ? "-" : "+"}$${Math.round(notional).toLocaleString()}`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{o.status}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
