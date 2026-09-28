import { NextResponse } from "next/server";
import { ibkrClient } from "@/lib/ibkr/client";
import { readCache, writeCache } from "@/lib/cache";
import { mockOrders } from "@/lib/mock-data";
import { Order } from "@/types";

const CACHE_KEY = "orders";

// Working/open statuses we surface on the dashboard (lower-cased for matching).
const OPEN_STATUSES = new Set([
  "submitted",
  "presubmitted",
  "pendingsubmit",
  "pendingcancel",
  "preapproved",
]);

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function transform(raw: unknown[]): Order[] {
  return raw
    .map((r, i): Order | null => {
      const o = r as Record<string, unknown>;
      const status = String(o.status ?? o.order_status ?? "").trim();
      const total = num(o.totalSize ?? o.total_size ?? o.remainingQuantity);
      const remaining = num(o.remainingQuantity ?? o.remaining_quantity ?? total);
      const filled = num(o.filledQuantity ?? o.filled_quantity ?? total - remaining);
      const rawPrice = o.price ?? o.limit_price ?? o.auxPrice;
      const price = rawPrice != null && rawPrice !== "" ? num(rawPrice) : null;
      return {
        id: String(o.orderId ?? o.order_ref ?? o.orderRef ?? `order-${i}`),
        symbol: String(o.ticker ?? o.symbol ?? o.conidex ?? "—"),
        side: String(o.side ?? "").toUpperCase() === "SELL" ? "SELL" : "BUY",
        quantity: total || remaining,
        filled,
        remaining,
        price,
        orderType: String(o.orderType ?? o.order_type ?? "").toUpperCase() || "—",
        status,
      };
    })
    .filter((o): o is Order => o != null && OPEN_STATUSES.has(o.status.toLowerCase()));
}

export async function GET() {
  const raw = await ibkrClient.getOrders();

  // Gateway responded (even with no orders) — trust it and refresh the cache.
  if (raw !== null) {
    const orders = transform(raw);
    writeCache(CACHE_KEY, orders);
    return NextResponse.json(orders);
  }

  // Gateway offline/logged out — serve the last known orders, then mock.
  const cached = readCache<Order[]>(CACHE_KEY);
  return NextResponse.json(cached ?? mockOrders);
}
