import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";
import { readCache, writeCache } from "@/lib/cache";
import { Transaction } from "@/types";
import { fetchFlexStatement, parseTrades, parseCashTransactions } from "@/lib/ibkr/flex";

const GATEWAY = process.env.IBKR_GATEWAY_URL || "https://localhost:5010/v1/api";
const ACCOUNT_ID = process.env.IBKR_ACCOUNT_ID || "";
const FLEX_ACTIVITY_QUERY_ID = process.env.IBKR_FLEX_ACTIVITY_QUERY_ID || "";

const ibkr = axios.create({
  baseURL: GATEWAY,
  timeout: 8000,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

const yahoo = axios.create({
  baseURL: "https://query1.finance.yahoo.com",
  timeout: 8000,
  headers: { "User-Agent": "Mozilla/5.0" },
});

function extractSymbol(contractDesc: string): string {
  const m = contractDesc.match(/\(([A-Z]{1,5})\)/);
  if (m) return m[1];
  const w = contractDesc.split(/\s/)[0];
  return /^[A-Z]{1,5}$/.test(w) ? w : contractDesc.slice(0, 5).trim();
}

async function getDividendTransactions(symbol: string, shares: number): Promise<Transaction[]> {
  try {
    const res = await yahoo.get(`/v8/finance/chart/${symbol}`, {
      params: { interval: "1d", range: "2y", events: "dividends" },
    });
    const result = res.data?.chart?.result?.[0];
    const rawDivs = result?.events?.dividends ?? {};
    const divList: { date: number; amount: number }[] = Object.values(rawDivs);

    return divList.map((d) => ({
      id: `div-${symbol}-${d.date}`,
      date: new Date(d.date * 1000).toISOString().split("T")[0],
      type: "DIVIDEND" as const,
      symbol,
      shares,
      price: d.amount,
      total: +(d.amount * shares).toFixed(2),
      fees: 0,
    }));
  } catch {
    return [];
  }
}

function parseFlexPositions(xml: string): { symbol: string; position: number }[] {
  const re = /<OpenPosition\s([^/]*?)\/>/g;
  const results: { symbol: string; position: number }[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    const attrs: Record<string, string> = {};
    const attrRe = /(\w+)="([^"]*)"/g;
    let a;
    while ((a = attrRe.exec(m[1])) !== null) attrs[a[1]] = a[2];
    if (attrs.symbol && attrs.position) {
      results.push({ symbol: attrs.symbol, position: Number(attrs.position) });
    }
  }
  return results;
}

function parseFlexTrades(xml: string): Transaction[] {
  const trades = parseTrades(xml);

    return trades
      .filter((t) => t.symbol && t.quantity > 0)
      .map((t, i) => {
        // Price may be 0 in XML (origTradePrice="0") — derive from netCash/quantity
        const derivedPrice =
          t.tradePrice > 0
            ? t.tradePrice
            : t.netCash !== 0 && t.quantity > 0
            ? Math.abs(t.netCash) / t.quantity
            : 0;

        // dateTime format: "20260217;093010" — convert to "2026-02-17"
        const raw = t.dateTime.split(";")[0].split(" ")[0];
        const dateStr =
          raw.length === 8 && !raw.includes("-")
            ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
            : raw;

        return {
          id: t.orderId || `flex-trade-${i}`,
          date: dateStr,
          type: t.buySell === "BUY" ? ("BUY" as const) : ("SELL" as const),
          symbol: t.symbol,
          shares: t.quantity,
          price: derivedPrice,
          total: +(derivedPrice * t.quantity).toFixed(2),
          fees: t.ibCommission,
        };
      });
}

function parseFlexTransfers(xml: string): Transaction[] {
  const cashTxns = parseCashTransactions(xml);
  return cashTxns
    .filter((t) => t.type === "Deposits/Withdrawals" && t.amount !== 0)
    .map((t, i) => {
      const raw = t.dateTime.split(";")[0].split(" ")[0];
      const dateStr =
        raw.length === 8 && !raw.includes("-")
          ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
          : raw;
      return {
        id: `transfer-${dateStr}-${i}`,
        date: dateStr,
        type: "TRANSFER" as const,
        symbol: t.description || "CASH",
        shares: 0,
        price: 0,
        total: t.amount,
        fees: 0,
      };
    });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? 365);
  const CACHE_KEY = `transactions_${days}`;

  try {
    // Fetch Flex XML and IBKR positions in parallel
    const flexXml = FLEX_ACTIVITY_QUERY_ID
      ? await fetchFlexStatement(FLEX_ACTIVITY_QUERY_ID).catch(() => null)
      : null;
    const flexTrades = flexXml ? parseFlexTrades(flexXml) : [];
    const flexTransfers = flexXml ? parseFlexTransfers(flexXml) : [];

    // Get positions from IBKR gateway, fall back to OpenPositions in Flex XML
    let positions: { symbol: string; position: number }[] = [];
    try {
      const posRes = await ibkr.get(`/portfolio/${ACCOUNT_ID}/positions/0`);
      positions = (posRes.data ?? []).map((p: { contractDesc: string; position: number }) => ({
        symbol: extractSymbol(p.contractDesc),
        position: p.position,
      }));
    } catch {
      if (flexXml) positions = parseFlexPositions(flexXml);
    }

    const dividendArrays = await Promise.all(
      positions.map((p) => getDividendTransactions(p.symbol, Math.abs(p.position)))
    );
    const dividendTransactions = dividendArrays.flat();

    const all = [...flexTrades, ...flexTransfers, ...dividendTransactions];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const filtered = all.filter((t) => new Date(t.date) >= cutoff);

    // Deduplicate by id
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
