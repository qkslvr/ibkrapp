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
      // Trailing stops report the trail as auxPrice "20.0%".
      const aux = String(o.auxPrice ?? "");
      const trailingPercent = aux.endsWith("%") ? num(aux.slice(0, -1)) : null;
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
        tif: String(o.timeInForce ?? o.tif ?? "") || undefined,
        trailingPercent,
        stopPrice: null,
      };
    })
    .filter((o): o is Order => o != null && OPEN_STATUSES.has(o.status.toLowerCase()));
}

// The order list doesn't carry the live trigger price of a stop; the per-order
// status endpoint does (once the order is working). Fill it in for stop orders.
async function attachStopPrices(orders: Order[]): Promise<Order[]> {
  const stops = orders.filter((o) => /STOP|STP|TRAIL/.test(o.orderType));
  await Promise.all(
    stops.map(async (o) => {
      const d = await ibkrClient.getOrderStatus(o.id);
      const sp = num(d?.stop_price);
      if (sp > 0) o.stopPrice = sp;
      if (o.trailingPercent == null && d?.trailing_amount != null && d?.trailing_amount_unit !== "amt")
        o.trailingPercent = num(d.trailing_amount) || null;
    }),
  );
  return orders;
}

export async function GET() {
  const raw = await ibkrClient.getOrders();

  // Gateway responded (even with no orders) — trust it and refresh the cache.
  if (raw !== null) {
    const orders = await attachStopPrices(transform(raw));
    writeCache(CACHE_KEY, orders);
    return NextResponse.json(orders);
  }

  // Gateway offline/logged out — serve the last known orders, then mock.
  const cached = readCache<Order[]>(CACHE_KEY);
  return NextResponse.json(cached ?? mockOrders);
}
