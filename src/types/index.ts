// Portfolio Types
export interface Position {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  dayChange: number;
  dayChangePercent: number;
  weight: number;
  sector: string;
  logo?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalReturn: number;
  totalReturnPercent: number;
  dayChange: number;
  dayChangePercent: number;
  cashBalance: number;
  buyingPower: number;
  marginUsed: number;
}

export interface SectorAllocation {
  sector: string;
  value: number;
  weight: number;
  color: string;
}

export interface DividendInfo {
  ytdIncome: number;
  projectedAnnual: number;
  nextDividend?: {
    symbol: string;
    exDate: string;
    payDate: string;
    amount: number;
  };
  portfolioYield: number;
}

export interface RiskMetrics {
  beta: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface TopMover {
  symbol: string;
  name: string;
  change: number;
  changePercent: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: "BUY" | "SELL" | "DIVIDEND" | "TRANSFER";
  symbol: string;
  shares: number;
  price: number;
  total: number;
  fees: number;
}

// Chart Types
export interface PerformanceDataPoint {
  date: string;
  value: number;
  benchmark?: number;
}

export interface ChartTimeframe {
  label: string;
  value: "1D" | "1W" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";
  days: number;
}

// Stock Detail Types
export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  high52w: number;
  low52w: number;
}

export interface StockFundamentals {
  peRatio: number;
  forwardPE: number;
  psRatio: number;
  pbRatio: number;
  evEbitda: number;
  pegRatio: number;
  eps: number;
  epsGrowth: number;
  revenue: number;
  revenueGrowth: number;
  netIncome: number;
  profitMargin: number;
  roe: number;
  roa: number;
  debtEquity: number;
  currentRatio: number;
  freeCashFlow: number;
}

export interface StockDividend {
  yield: number;
  annualDividend: number;
  payoutRatio: number;
  exDate?: string;
  payDate?: string;
  growthRate5Y: number;
}

export interface AnalystRating {
  buy: number;
  hold: number;
  sell: number;
  targetLow: number;
  targetMean: number;
  targetHigh: number;
}

// API Response Types
export interface IBKRAccountSummary {
  accountId: string;
  netLiquidation: number;
  totalCashValue: number;
  buyingPower: number;
  grossPositionValue: number;
  maintMarginReq: number;
  excessLiquidity: number;
  dailyPnl: number;
  unrealizedPnl: number;
}

export interface IBKRPosition {
  conid: number;
  contractDesc: string;
  position: number;
  mktPrice: number;
  mktValue: number;
  avgCost: number;
  unrealizedPnl: number;
  realizedPnl: number;
  assetClass?: string; // STK, OPT, FUT, etc.
  currency?: string;
  acctId?: string;
}
