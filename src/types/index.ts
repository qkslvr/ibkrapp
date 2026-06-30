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

// NAV Types
export interface NAVDeposit {
  date: string;
  amount: number;
  navAtDeposit: number;
  unitsIssued: number;
}

export interface NAVMonthlySnapshot {
  month: string; // "2026-02"
  portfolioValue: number;
  totalUnits: number;
  nav: number;
  returnPct: number; // vs $100 base
}

export interface NAVSummary {
  currentNAV: number;
  totalUnits: number;
  totalCapitalInvested: number;
  currentPortfolioValue: number;
  totalReturnPct: number;
  deposits: NAVDeposit[];
  monthly: NAVMonthlySnapshot[];
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

// Stock Screener (Finviz)
// Numeric fields are `null` when Finviz reports no value. Percentage fields
// (growth, margins, performance) are stored as plain numbers, e.g. 22.04 = 22.04%.
export interface ScreenerStock {
  ticker: string;
  company: string;
  sector: string;
  industry: string;
  marketCap: number | null; // dollars
  pe: number | null;
  forwardPE: number | null;
  peg: number | null;
  ps: number | null;
  pb: number | null;
  dividendYield: number | null; // %
  eps: number | null;
  epsGrowthThisYear: number | null; // %
  epsGrowthNextYear: number | null; // %
  epsGrowthPast5Y: number | null; // %
  salesGrowthPast5Y: number | null; // %
  epsGrowthQoQ: number | null; // % — quarter-over-quarter EPS growth
  salesGrowthQoQ: number | null; // % — quarter-over-quarter revenue/sales growth
  roa: number | null; // %
  roe: number | null; // %
  grossMargin: number | null; // %
  operatingMargin: number | null; // %
  profitMargin: number | null; // %
  perfQuarter: number | null; // %
  perfYear: number | null; // %
  perfYTD: number | null; // %
  analystRecom: number | null; // 1 = Strong Buy … 5 = Strong Sell
  price: number | null;
  change: number | null; // %
  volume: number | null;
  earningsDate: string | null;
}

export interface TickerSearchResult {
  ticker: string;
  company: string;
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
