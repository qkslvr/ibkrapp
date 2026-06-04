import {
  Position,
  PortfolioSummary,
  Transaction,
  IBKRAccountSummary,
  IBKRPosition,
} from "@/types";
import { FinnhubQuote, FinnhubProfile } from "@/lib/finnhub/client";

// Extract ticker symbol from IBKR contract description
// IBKR descriptions look like "AAPL" or "AAPL Stock" or "Apple Inc (AAPL)"
function extractSymbol(contractDesc: string): string {
  // Try to extract uppercase ticker from parentheses first
  const parenMatch = contractDesc.match(/\(([A-Z]{1,5})\)/);
  if (parenMatch) return parenMatch[1];
  // Otherwise take the first word if it's all uppercase letters
  const firstWord = contractDesc.split(/\s/)[0];
  if (/^[A-Z]{1,5}$/.test(firstWord)) return firstWord;
  return contractDesc.slice(0, 5).trim();
}

export function transformAccountSummary(
  raw: IBKRAccountSummary,
  positions: IBKRPosition[]
): PortfolioSummary {
  const totalDeposited = Number(process.env.TOTAL_DEPOSITED ?? 0);
  const totalCost = totalDeposited || positions.reduce((sum, p) => sum + p.mktValue, 0);
  const totalReturn = raw.netLiquidation - totalCost;
  const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
  // Use IBKR's dailyPnl field for today's change; fall back to 0 if not available
  const dayChange = raw.dailyPnl ?? 0;
  const prevValue = raw.netLiquidation - dayChange;
  const dayChangePercent = prevValue !== 0 ? (dayChange / Math.abs(prevValue)) * 100 : 0;

  return {
    totalValue: raw.netLiquidation,
    totalCost,
    totalReturn,
    totalReturnPercent,
    dayChange,
    dayChangePercent,
    cashBalance: raw.totalCashValue,
    buyingPower: raw.buyingPower,
    marginUsed: raw.maintMarginReq ?? 0,
  };
}

export function transformPosition(
  raw: IBKRPosition,
  quote: FinnhubQuote | null,
  profile: FinnhubProfile | null,
  totalPortfolioValue: number
): Position {
  const symbol = extractSymbol(raw.contractDesc);
  const isOption = raw.assetClass === "OPT";

  // For options, use IBKR's mktValue directly (includes multiplier & sign)
  // For stocks, use Finnhub quote if available
  const currentPrice = isOption ? raw.mktPrice : (quote?.c ?? raw.mktPrice);
  const marketValue = isOption ? raw.mktValue : currentPrice * raw.position;
  const costBasis = raw.avgCost * raw.position;
  const unrealizedPL = marketValue - costBasis;
  const absCostBasis = Math.abs(costBasis);
  const unrealizedPLPercent = absCostBasis > 0 ? (unrealizedPL / absCostBasis) * 100 : 0;
  const dayChange = (!isOption && quote) ? (quote.c - quote.pc) * raw.position : 0;
  const dayChangePercent = (!isOption && quote && quote.pc > 0) ? ((quote.c - quote.pc) / quote.pc) * 100 : 0;
  const weight = totalPortfolioValue > 0 ? (Math.abs(marketValue) / totalPortfolioValue) * 100 : 0;

  // For options, show contract description as name instead of company name
  const displayName = isOption
    ? raw.contractDesc.split("[")[0].trim()
    : (profile?.name ?? symbol);

  return {
    symbol,
    name: displayName,
    shares: raw.position,
    avgCost: raw.avgCost,
    currentPrice,
    marketValue,
    costBasis,
    unrealizedPL,
    unrealizedPLPercent,
    dayChange,
    dayChangePercent,
    weight,
    sector: profile?.finnhubIndustry ?? "Unknown",
    logo: profile?.logo ?? undefined,
  };
}

export function transformPositions(
  rawPositions: IBKRPosition[],
  quotes: Map<string, FinnhubQuote | null>,
  profiles: Map<string, FinnhubProfile | null>,
  totalPortfolioValue: number
): Position[] {
  return rawPositions.map((raw) => {
    const symbol = extractSymbol(raw.contractDesc);
    return transformPosition(
      raw,
      quotes.get(symbol) ?? null,
      profiles.get(symbol) ?? null,
      totalPortfolioValue
    );
  });
}

// Parse IBKR trade_time format: "20260327-19:51:48" → "2026-03-27"
function parseIBKRTradeDate(raw: Record<string, unknown>): string {
  // trade_time_r is unix ms — most reliable
  if (raw.trade_time_r && typeof raw.trade_time_r === "number") {
    return new Date(raw.trade_time_r).toISOString().split("T")[0];
  }
  // trade_time is "YYYYMMDD-HH:MM:SS"
  if (raw.trade_time && typeof raw.trade_time === "string") {
    const datePart = raw.trade_time.split("-")[0];
    if (datePart.length === 8) {
      return `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
    }
  }
  // camelCase fallbacks from other IBKR endpoints
  if (raw.tradeTime && typeof raw.tradeTime === "string") {
    return new Date(raw.tradeTime).toISOString().split("T")[0];
  }
  if (raw.date && typeof raw.date === "string") return raw.date as string;
  return new Date().toISOString().split("T")[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformTrade(raw: Record<string, any>, index: number): Transaction {
  const type = (() => {
    const side = (raw.side ?? raw.type ?? "").toUpperCase();
    if (side === "B" || side === "BUY") return "BUY" as const;
    if (side === "S" || side === "SELL") return "SELL" as const;
    if (side === "D" || side === "DIV" || side === "DIVIDEND") return "DIVIDEND" as const;
    return "BUY" as const;
  })();

  const shares = Math.abs(Number(raw.size ?? raw.quantity ?? raw.shares ?? 0));
  const price = Number(raw.price ?? raw.tradePrice ?? 0);
  const total = shares * price;
  const fees = Number(raw.commission ?? raw.fees ?? 0);

  return {
    id: raw.execution_id ?? raw.tradeId ?? raw.orderId ?? String(index),
    date: parseIBKRTradeDate(raw),
    type,
    symbol: raw.symbol ?? raw.contract_description_1 ?? raw.contractDesc ?? "",
    shares,
    price,
    total,
    fees,
  };
}
