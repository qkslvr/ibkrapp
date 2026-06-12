import {
  Position,
  PortfolioSummary,
  SectorAllocation,
  DividendInfo,
  RiskMetrics,
  TopMover,
  Transaction,
  PerformanceDataPoint,
} from "@/types";

// Portfolio Summary — snapshot from live IBKR data (2026-05-14)
export const mockPortfolioSummary: PortfolioSummary = {
  totalValue: 1077421,
  totalCost: 1000000,
  totalReturn: 77421,
  totalReturnPercent: 7.74,
  dayChange: 0,
  dayChangePercent: 0,
  cashBalance: 1003441.19,
  buyingPower: 4229933,
  marginUsed: 18235.56,
};

// Positions — snapshot from live IBKR data (2026-05-14)
export const mockPositions: Position[] = [
  {
    symbol: "AVGO",
    name: "Broadcom Inc",
    shares: 32,
    avgCost: 401.06,
    currentPrice: 416.79,
    marketValue: 13337.28,
    costBasis: 12833.92,
    unrealizedPL: 504,
    unrealizedPLPercent: 3.93,
    dayChange: -80.32,
    dayChangePercent: -0.60,
    weight: 18.28,
    sector: "Semiconductors",
    logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AVGO.png",
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices Inc",
    shares: 29.7418,
    avgCost: 323.65,
    currentPrice: 445.5,
    marketValue: 13249.97,
    costBasis: 9625.99,
    unrealizedPL: 3416.38,
    unrealizedPLPercent: 35.49,
    dayChange: -82.98,
    dayChangePercent: -0.62,
    weight: 18.16,
    sector: "Semiconductors",
    logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AMD.png",
  },
  {
    symbol: "TSM",
    name: "Taiwan Semiconductor Manufacturing Co Ltd",
    shares: 32.9306,
    avgCost: 389.73,
    currentPrice: 399.8,
    marketValue: 13165.65,
    costBasis: 12833.98,
    unrealizedPL: 516.08,
    unrealizedPLPercent: 4.02,
    dayChange: 82.99,
    dayChangePercent: 0.63,
    weight: 18.05,
    sector: "Semiconductors",
    logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/TSM.png",
  },
  {
    symbol: "KLAC",
    name: "KLA Corp",
    shares: 7,
    avgCost: 1810.45,
    currentPrice: 1849.71,
    marketValue: 12947.97,
    costBasis: 12673.17,
    unrealizedPL: 234.69,
    unrealizedPLPercent: 1.85,
    dayChange: 268.52,
    dayChangePercent: 2.12,
    weight: 17.75,
    sector: "Semiconductors",
    logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/KLAC.png",
  },
  {
    symbol: "CDNS",
    name: "Cadence Design Systems Inc",
    shares: 30.1128,
    avgCost: 319.66,
    currentPrice: 354.55,
    marketValue: 10676.49,
    costBasis: 9625.98,
    unrealizedPL: 1050.21,
    unrealizedPLPercent: 10.91,
    dayChange: -105.09,
    dayChangePercent: -0.97,
    weight: 14.64,
    sector: "Technology",
    logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/CDNS.png",
  },
  {
    symbol: "MU",
    name: "Micron Technology Inc",
    shares: 12.2997,
    avgCost: 521.8,
    currentPrice: 803.63,
    marketValue: 9884.41,
    costBasis: 6418.0,
    unrealizedPL: 3210.21,
    unrealizedPLPercent: 50.02,
    dayChange: 455.7,
    dayChangePercent: 4.83,
    weight: 13.55,
    sector: "Semiconductors",
    logo: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/MU.png",
  },
];

// Sector Allocation — derived from live positions
export const mockSectorAllocation: SectorAllocation[] = [
  { sector: "Semiconductors", value: 63283.28, weight: 86.73, color: "#6366f1" },
  { sector: "Technology", value: 10676.49, weight: 14.64, color: "#22c55e" },
  { sector: "Cash", value: 1003441.19, weight: 93.13, color: "#64748b" },
];

// Dividend Info — placeholder (IBKR doesn't expose this easily via CP Gateway)
export const mockDividendInfo: DividendInfo = {
  ytdIncome: 0,
  projectedAnnual: 0,
  nextDividend: {
    symbol: "—",
    exDate: "—",
    payDate: "—",
    amount: 0,
  },
  portfolioYield: 0,
};

// Risk Metrics — placeholder
export const mockRiskMetrics: RiskMetrics = {
  beta: 1.35,
  volatility: 22.1,
  sharpeRatio: 1.18,
  maxDrawdown: -6.4,
};

// Top Movers — derived from live positions
export const mockTopMovers: { gainers: TopMover[]; losers: TopMover[] } = {
  gainers: [
    { symbol: "MU", name: "Micron Technology Inc", change: 455.7, changePercent: 4.83 },
    { symbol: "KLAC", name: "KLA Corp", change: 268.52, changePercent: 2.12 },
    { symbol: "TSM", name: "Taiwan Semiconductor", change: 82.99, changePercent: 0.63 },
  ],
  losers: [
    { symbol: "CDNS", name: "Cadence Design Systems", change: -105.09, changePercent: -0.97 },
    { symbol: "AMD", name: "Advanced Micro Devices", change: -82.98, changePercent: -0.62 },
    { symbol: "AVGO", name: "Broadcom Inc", change: -80.32, changePercent: -0.60 },
  ],
};

// Recent Transactions — placeholder (no recent trades in IBKR account)
export const mockTransactions: Transaction[] = [];

// Performance Data — snapshot from live IBKR PA data (1M, as of 2026-05-14)
export const mockPerformanceData: PerformanceDataPoint[] = [
  { date: "2026-04-14", value: 1036393 },
  { date: "2026-04-15", value: 1048045 },
  { date: "2026-04-16", value: 1051148 },
  { date: "2026-04-17", value: 1058451 },
  { date: "2026-04-20", value: 1053994 },
  { date: "2026-04-21", value: 1051996 },
  { date: "2026-04-22", value: 1064682 },
  { date: "2026-04-23", value: 1052509 },
  { date: "2026-04-24", value: 1067587 },
  { date: "2026-04-27", value: 1073159 },
  { date: "2026-04-28", value: 1072476 },
  { date: "2026-04-29", value: 1068320 },
  { date: "2026-04-30", value: 1068838 },
  { date: "2026-05-01", value: 1069762 },
  { date: "2026-05-04", value: 1070022 },
  { date: "2026-05-05", value: 1071672 },
  { date: "2026-05-06", value: 1075437 },
  { date: "2026-05-07", value: 1073994 },
  { date: "2026-05-08", value: 1078096 },
  { date: "2026-05-11", value: 1078651 },
  { date: "2026-05-12", value: 1077117 },
  { date: "2026-05-13", value: 1077743 },
  { date: "2026-05-14", value: 1077457 },
];

// Market indices (for reference)
export const mockIndices = {
  SPY: { price: 502.34, change: 0.45 },
  QQQ: { price: 438.12, change: 0.72 },
  DIA: { price: 392.56, change: 0.21 },
};
