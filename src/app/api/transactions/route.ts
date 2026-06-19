import { NextResponse } from "next/server";
import { readCache, writeCache } from "@/lib/cache";
import { Transaction } from "@/types";
import { fetchFlexStatement, parseTrades, parseCashTransactions, parseTransfers } from "@/lib/ibkr/flex";

const FLEX_ACTIVITY_QUERY_ID = process.env.IBKR_FLEX_ACTIVITY_QUERY_ID || "";

function parseDateStr(raw: string): string {
  const d = raw.split(";")[0].split(" ")[0];
  return d.length === 8 && !d.includes("-")
    ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
    : d;
}

function parseFlexTrades(xml: string): Transaction[] {
  return parseTrades(xml)
    .filter((t) => t.symbol && t.quantity > 0)
    .map((t, i) => {
      const derivedPrice =
        t.tradePrice > 0
          ? t.tradePrice
          : t.netCash !== 0 && t.quantity > 0
          ? Math.abs(t.netCash) / t.quantity
          : 0;
      return {
        id: t.orderId || `flex-trade-${i}`,
        date: parseDateStr(t.dateTime),
        type: t.buySell === "BUY" ? ("BUY" as const) : ("SELL" as const),
        symbol: t.symbol,
        shares: t.quantity,
        price: derivedPrice,
        total: +(derivedPrice * t.quantity).toFixed(2),
        fees: t.ibCommission,
      };
    });
}

function parseFlexDividends(xml: string): Transaction[] {
  return parseCashTransactions(xml)
    .filter((t) => t.type === "Dividends" && t.amount > 0)
    .map((t, i) => {
      const symbol = t.symbol || t.description.split("(")[0].trim() || "UNKNOWN";
      return {
        id: `div-flex-${symbol}-${t.dateTime}-${i}`,
        date: parseDateStr(t.dateTime),
        type: "DIVIDEND" as const,
        symbol,
        shares: 0,
        price: 0,
        total: t.amount,
        fees: 0,
      };
    });
}

function parseFlexDeposits(xml: string): Transaction[] {
  return parseCashTransactions(xml)
    .filter((t) => t.type === "Deposits/Withdrawals" && t.amount !== 0)
    .map((t, i) => ({
      id: `deposit-${t.dateTime}-${i}`,
      date: parseDateStr(t.dateTime),
      type: "TRANSFER" as const,
      symbol: t.description || "CASH",
      shares: 0,
      price: 0,
      total: t.amount,
      fees: 0,
    }));
}

function parseFlexTransfers(xml: string): Transaction[] {
  return parseTransfers(xml)
    .filter((t) => t.quantity !== 0 || t.cashTransfer !== 0)
    .map((t, i) => {
      const total = t.cashTransfer !== 0 ? t.cashTransfer : t.transferPrice * Math.abs(t.quantity);
      return {
        id: `transfer-${t.date}-${t.symbol || "cash"}-${i}`,
        date: parseDateStr(t.date),
        type: "TRANSFER" as const,
        symbol: t.symbol || t.description || "TRANSFER",
        shares: Math.abs(t.quantity),
        price: t.transferPrice,
        total,
        fees: 0,
      };
    });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? 365);
  const CACHE_KEY = `transactions_${days}`;

  try {
    const flexXml = FLEX_ACTIVITY_QUERY_ID
      ? await fetchFlexStatement(FLEX_ACTIVITY_QUERY_ID).catch(() => null)
      : null;

    const all = flexXml
      ? [
          ...parseFlexTrades(flexXml),
          ...parseFlexDividends(flexXml),
          ...parseFlexDeposits(flexXml),
          ...parseFlexTransfers(flexXml),
        ]
      : [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const filtered = all.filter((t) => new Date(t.date) >= cutoff);

    const seen = new Set<string>();
    const deduped = filtered.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    deduped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    writeCache(CACHE_KEY, deduped);
    return NextResponse.json(deduped);
  } catch (err) {
    console.error("[transactions]", err);
    const cached = readCache<Transaction[]>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
    return NextResponse.json([]);
  }
}
