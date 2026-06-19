import axios from "axios";
import { readCache, writeCache } from "@/lib/cache";

const FLEX_BASE = "https://gdcdyn.interactivebrokers.com/Universal/servlet/FlexStatementService";
const TOKEN = process.env.IBKR_FLEX_TOKEN ?? "";

const client = axios.create({ timeout: 15000 });

// Step 1: request a statement — returns a reference code
async function sendRequest(queryId: string): Promise<string> {
  const res = await client.get(`${FLEX_BASE}.SendRequest`, {
    params: { t: TOKEN, q: queryId, v: 3 },
    responseType: "text",
  });
  const xml: string = res.data;
  const status = xml.match(/<Status>(.*?)<\/Status>/)?.[1];
  if (status !== "Success") {
    const msg = xml.match(/<ErrorMessage>(.*?)<\/ErrorMessage>/)?.[1] ?? xml;
    throw new Error(`Flex SendRequest failed: ${msg}`);
  }
  const ref = xml.match(/<ReferenceCode>(.*?)<\/ReferenceCode>/)?.[1];
  if (!ref) throw new Error("No reference code in Flex response");
  return ref;
}

// Step 2: retrieve the statement using the reference code (may need retries)
async function getStatement(refCode: string): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
    const res = await client.get(`${FLEX_BASE}.GetStatement`, {
      params: { t: TOKEN, q: refCode, v: 3 },
      responseType: "text",
    });
    const xml: string = res.data;
    if (xml.includes("<FlexQueryResponse")) return xml;
    const status = xml.match(/<Status>(.*?)<\/Status>/)?.[1];
    if (status === "Success") return xml;
    // Still generating — wait and retry
    if (xml.includes("Statement generation in progress")) continue;
    throw new Error(`Flex GetStatement error: ${xml.slice(0, 200)}`);
  }
  throw new Error("Flex statement timed out");
}

export async function fetchFlexStatement(queryId: string): Promise<string> {
  const cacheKey = `flex_xml_${queryId}`;
  try {
    const ref = await sendRequest(queryId);
    const xml = await getStatement(ref);
    // Cache the raw XML so we survive future Flex outages
    writeCache(cacheKey, xml);
    return xml;
  } catch (err) {
    const cached = readCache<string>(cacheKey);
    if (cached) {
      console.warn("[flex] Flex API failed, using cached XML:", (err as Error).message);
      return cached;
    }
    throw err;
  }
}

// ── XML parsers ──────────────────────────────────────────────────────────────

function parseAttrs(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(tag)) !== null) attrs[m[1]] = m[2];
  return attrs;
}

function extractTags(xml: string, tagName: string): Record<string, string>[] {
  const results: Record<string, string>[] = [];
  const re = new RegExp(`<${tagName}\\s(.*?)/>`, "gs");
  let m;
  while ((m = re.exec(xml)) !== null) results.push(parseAttrs(m[1]));
  return results;
}

export interface FlexTrade {
  dateTime: string;
  symbol: string;
  buySell: string;   // "BUY" | "SELL"
  quantity: number;
  tradePrice: number;
  ibCommission: number;
  netCash: number;
  orderId: string;
  currency: string;
}

export interface FlexCashTransaction {
  dateTime: string;
  type: string;       // "Deposits/Withdrawals" | "Dividends" | etc.
  symbol: string;
  amount: number;
  currency: string;
  description: string;
}

export function parseTrades(xml: string): FlexTrade[] {
  return extractTags(xml, "Trade").map((a) => ({
    dateTime: a.dateTime ?? a.tradeDate ?? "",
    symbol: a.symbol ?? "",
    buySell: a.buySell?.toUpperCase().startsWith("B") ? "BUY" : "SELL",
    quantity: Math.abs(Number(a.quantity ?? 0)),
    tradePrice: Number(a.tradePrice ?? 0),
    ibCommission: Math.abs(Number(a.ibCommission ?? 0)),
    netCash: Number(a.netCash ?? 0),
    orderId: a.orderId ?? a.tradeID ?? "",
    currency: a.currency ?? "USD",
  }));
}

export function parseCashTransactions(xml: string): FlexCashTransaction[] {
  return extractTags(xml, "CashTransaction").map((a) => ({
    dateTime: a.dateTime ?? a.reportDate ?? "",
    type: a.type ?? "",
    symbol: a.symbol ?? "",
    amount: Number(a.amount ?? 0),
    currency: a.currency ?? "USD",
    description: a.description ?? "",
  }));
}

export interface FlexTransfer {
  date: string;
  symbol: string;
  description: string;
  quantity: number;
  transferPrice: number;
  cashTransfer: number;
  direction: string; // "IN" | "OUT"
  currency: string;
}

export interface FlexEquitySummary {
  reportDate: string;
  total: number;
  cash: number;
  stock: number;
}

export function parseEquitySummary(xml: string): FlexEquitySummary[] {
  return extractTags(xml, "EquitySummaryByReportDateInBase").map((a) => ({
    reportDate: a.reportDate ?? "",
    total: Number(a.total ?? a.totalLong ?? 0),
    cash: Number(a.cash ?? 0),
    stock: Number(a.stock ?? a.equityWithLoanValue ?? 0),
  }));
}

export function parseTransfers(xml: string): FlexTransfer[] {
  return extractTags(xml, "Transfer").map((a) => ({
    date: a.date ?? a.reportDate ?? "",
    symbol: a.symbol ?? "",
    description: a.description ?? "",
    quantity: Number(a.quantity ?? 0),
    transferPrice: Number(a.transferPrice ?? a.price ?? 0),
    cashTransfer: Number(a.cashTransfer ?? 0),
    direction: (a.direction ?? a.transferDirection ?? "").toUpperCase(),
    currency: a.currency ?? "USD",
  }));
}
