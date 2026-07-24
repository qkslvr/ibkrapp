import { readCache, writeCache } from "@/lib/cache";
import { ScreenerStock, TickerSearchResult } from "@/types";

// Finviz Elite CSV export. NOTE: the host 301-redirects /export.ashx -> /export.
const BASE = "https://elite.finviz.com/export";
const API_KEY = process.env.FINVIZ_API_KEY || "";

// Custom-view (v=152) column indices we request. The export echoes columns in
// this order with named headers; we still parse by header name to be robust.
const COLUMN_INDICES = [
  1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 14, 16, 17, 18, 19, 21, 22, 23, 32, 33, 39,
  40, 41, 44, 46, 47, 48, 62, 65, 66, 67, 68,
];

export type ScreenerIndex = "sp500" | "ndx" | "dji" | "all";

const INDEX_FILTER: Record<ScreenerIndex, string> = {
  sp500: "idx_sp500",
  ndx: "idx_ndx",
  dji: "idx_dji",
  all: "",
};

const SCREEN_TTL = 30 * 60_000; // 30 min
const UNIVERSE_TTL = 24 * 60 * 60_000; // 24 h
const QUOTES_TTL = 60_000; // 1 min — live enough, avoids hammering Finviz on every poll

function buildUrl(params: Record<string, string>): string {
  const url = new URL(BASE);
  url.searchParams.set("v", "152");
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  url.searchParams.set("auth", API_KEY);
  return url.toString();
}

/** Parse one CSV row, honoring quoted fields and "" escapes. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Finviz uses "-" for missing values; percentages carry a trailing "%". */
function num(raw: string | undefined): number | null {
  if (raw == null) return null;
  const s = raw.trim().replace(/[%,]/g, "");
  if (s === "" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function str(raw: string | undefined): string {
  const s = (raw ?? "").trim();
  return s === "-" ? "" : s;
}

async function fetchCsv(url: string): Promise<string[][] | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(url, { redirect: "follow", next: { revalidate: 0 } });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    return lines.map(parseCsvLine);
  } catch {
    return null;
  }
}

function rowsToStocks(rows: string[][]): ScreenerStock[] {
  if (rows.length < 2) return [];
  const header = rows[0];
  const idx = (name: string) => header.indexOf(name);
  const col = {
    ticker: idx("Ticker"),
    company: idx("Company"),
    sector: idx("Sector"),
    industry: idx("Industry"),
    marketCap: idx("Market Cap"),
    pe: idx("P/E"),
    forwardPE: idx("Forward P/E"),
    peg: idx("PEG"),
    ps: idx("P/S"),
    pb: idx("P/B"),
    dividendYield: idx("Dividend Yield"),
    eps: idx("EPS (ttm)"),
    epsGrowthThisYear: idx("EPS Growth This Year"),
    epsGrowthNextYear: idx("EPS Growth Next Year"),
    epsGrowthPast5Y: idx("EPS Growth Past 5 Years"),
    salesGrowthPast5Y: idx("Sales Growth Past 5 Years"),
    epsGrowthQoQ: idx("EPS Growth Quarter Over Quarter"),
    salesGrowthQoQ: idx("Sales Growth Quarter Over Quarter"),
    roa: idx("Return on Assets"),
    roe: idx("Return on Equity"),
    grossMargin: idx("Gross Margin"),
    operatingMargin: idx("Operating Margin"),
    profitMargin: idx("Profit Margin"),
    perfQuarter: idx("Performance (Quarter)"),
    perfYear: idx("Performance (Year)"),
    perfYTD: idx("Performance (YTD)"),
    analystRecom: idx("Analyst Recom"),
    beta: idx("Beta"),
    price: idx("Price"),
    change: idx("Change"),
    volume: idx("Volume"),
    earningsDate: idx("Earnings Date"),
  };

  return rows.slice(1).map((r) => {
    const mc = num(r[col.marketCap]);
    return {
      ticker: str(r[col.ticker]),
      company: str(r[col.company]),
      sector: str(r[col.sector]),
      industry: str(r[col.industry]),
      marketCap: mc != null ? mc * 1e6 : null, // Finviz reports millions; store dollars
      pe: num(r[col.pe]),
      forwardPE: num(r[col.forwardPE]),
      peg: num(r[col.peg]),
      ps: num(r[col.ps]),
      pb: num(r[col.pb]),
      dividendYield: num(r[col.dividendYield]),
      eps: num(r[col.eps]),
      epsGrowthThisYear: num(r[col.epsGrowthThisYear]),
      epsGrowthNextYear: num(r[col.epsGrowthNextYear]),
      epsGrowthPast5Y: num(r[col.epsGrowthPast5Y]),
      salesGrowthPast5Y: num(r[col.salesGrowthPast5Y]),
      epsGrowthQoQ: num(r[col.epsGrowthQoQ]),
      salesGrowthQoQ: num(r[col.salesGrowthQoQ]),
      roa: num(r[col.roa]),
      roe: num(r[col.roe]),
      grossMargin: num(r[col.grossMargin]),
      operatingMargin: num(r[col.operatingMargin]),
      profitMargin: num(r[col.profitMargin]),
      perfQuarter: num(r[col.perfQuarter]),
      perfYear: num(r[col.perfYear]),
      perfYTD: num(r[col.perfYTD]),
      analystRecom: num(r[col.analystRecom]),
      beta: num(r[col.beta]),
      price: num(r[col.price]),
      change: num(r[col.change]),
      volume: num(r[col.volume]),
      earningsDate: str(r[col.earningsDate]) || null,
    };
  }).filter((s) => s.ticker);
}

/** Screen an index universe, returning rich fundamentals. Falls back to stale
 *  cache when Finviz is unreachable. */
export async function screenIndex(index: ScreenerIndex): Promise<ScreenerStock[]> {
  const cacheKey = `finviz-screen-${index}`;
  const fresh = readCache<ScreenerStock[]>(cacheKey, SCREEN_TTL);
  if (fresh) return fresh;

  const url = buildUrl({
    f: INDEX_FILTER[index],
    c: COLUMN_INDICES.join(","),
  });
  const rows = await fetchCsv(url);
  if (!rows) {
    // network failed — serve stale cache if we have any
    return readCache<ScreenerStock[]>(cacheKey) ?? [];
  }
  const stocks = rowsToStocks(rows);
  if (stocks.length > 0) writeCache(cacheKey, stocks);
  return stocks;
}

// Full column set for a single-ticker detail lookup (the stock detail page).
// Requesting everything is simpler than curating a subset and costs nothing
// extra since it's a one-row export.
const DETAIL_COLUMNS = Array.from({ length: 70 }, (_, i) => i + 1);
const DETAIL_TTL = 30_000; // matches the stock detail page's quote refetch cadence

export interface FinvizStockDetail {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  change: number; // % change from previous close
  open: number | null;
  prevClose: number | null;
  high52w: number | null;
  low52w: number | null;
  volume: number | null;
  avgVolume: number | null;
  marketCap: number | null; // dollars
  peRatio: number | null;
  forwardPE: number | null;
  psRatio: number | null;
  pbRatio: number | null;
  pegRatio: number | null;
  eps: number | null;
  epsGrowth: number | null; // EPS Growth This Year, %
  revenueGrowth: number | null; // Sales Growth QoQ, %
  profitMargin: number | null;
  roe: number | null;
  roa: number | null;
  debtEquity: number | null;
  currentRatio: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  analystRecom: number | null; // 1 (Strong Buy) .. 5 (Strong Sell)
  targetPrice: number | null;
  earningsDate: string | null;
}

// Finviz reports 52W/50D high-low, change-from-open, and SMA distance columns
// as a % distance from the current price rather than a price level — back
// out the level: pct = (price - level) / level * 100  =>  level = price / (1 + pct/100)
function pctToLevel(price: number, pct: number | null): number | null {
  if (pct == null) return null;
  const denom = 1 + pct / 100;
  return denom !== 0 ? price / denom : null;
}

/** Rich single-ticker quote + fundamentals for the stock detail page. Cached
 *  briefly per ticker; falls back to the last-known value if Finviz is
 *  unreachable. */
export async function getStockDetail(symbol: string): Promise<FinvizStockDetail | null> {
  const ticker = symbol.trim().toUpperCase();
  if (!ticker) return null;
  const cacheKey = `finviz-detail-${ticker}`;

  const fresh = readCache<FinvizStockDetail>(cacheKey, DETAIL_TTL);
  if (fresh) return fresh;

  const url = buildUrl({ t: ticker, c: DETAIL_COLUMNS.join(",") });
  const rows = await fetchCsv(url);
  if (!rows || rows.length < 2) {
    return readCache<FinvizStockDetail>(cacheKey);
  }

  const header = rows[0];
  const values = rows[1];
  const get = (name: string) => values[header.indexOf(name)];

  const price = num(get("Price"));
  if (price == null) return readCache<FinvizStockDetail>(cacheKey);

  const changePct = num(get("Change"));
  const changeFromOpenPct = num(get("Change from Open"));
  const high52wPct = num(get("52-Week High"));
  const low52wPct = num(get("52-Week Low"));
  const avgVolumeRaw = num(get("Average Volume"));
  const marketCapRaw = num(get("Market Cap"));

  const detail: FinvizStockDetail = {
    ticker,
    name: str(get("Company")) || ticker,
    sector: str(get("Sector")) || "Unknown",
    industry: str(get("Industry")) || "Unknown",
    price,
    change: changePct ?? 0,
    open: pctToLevel(price, changeFromOpenPct),
    prevClose: pctToLevel(price, changePct),
    high52w: pctToLevel(price, high52wPct),
    low52w: pctToLevel(price, low52wPct),
    volume: num(get("Volume")),
    avgVolume: avgVolumeRaw != null ? avgVolumeRaw * 1000 : null,
    marketCap: marketCapRaw != null ? marketCapRaw * 1e6 : null,
    peRatio: num(get("P/E")),
    forwardPE: num(get("Forward P/E")),
    psRatio: num(get("P/S")),
    pbRatio: num(get("P/B")),
    pegRatio: num(get("PEG")),
    eps: num(get("EPS (ttm)")),
    epsGrowth: num(get("EPS Growth This Year")),
    revenueGrowth: num(get("Sales Growth Quarter Over Quarter")),
    profitMargin: num(get("Profit Margin")),
    roe: num(get("Return on Equity")),
    roa: num(get("Return on Assets")),
    debtEquity: num(get("Total Debt/Equity")),
    currentRatio: num(get("Current Ratio")),
    dividendYield: num(get("Dividend Yield")),
    payoutRatio: num(get("Payout Ratio")),
    analystRecom: num(get("Analyst Recom")),
    targetPrice: num(get("Target Price")),
    earningsDate: str(get("Earnings Date")) || null,
  };

  writeCache(cacheKey, detail);
  return detail;
}

/** Live quote + fundamentals (price, market cap, sector, ...) for a specific
 *  set of tickers, e.g. a portfolio's holdings. Cached briefly per ticker
 *  set; falls back to the last-known values for that set if Finviz is
 *  unreachable. */
export async function getQuotesForTickers(
  tickers: string[]
): Promise<Map<string, ScreenerStock>> {
  if (tickers.length === 0) return new Map();
  const key = [...new Set(tickers)].sort().join(",");
  const cacheKey = `finviz-quotes-${key}`;

  const fresh = readCache<ScreenerStock[]>(cacheKey, QUOTES_TTL);
  if (fresh) return new Map(fresh.map((s) => [s.ticker, s]));

  const url = buildUrl({ t: key, c: COLUMN_INDICES.join(",") });
  const rows = await fetchCsv(url);
  if (!rows) {
    const stale = readCache<ScreenerStock[]>(cacheKey) ?? [];
    return new Map(stale.map((s) => [s.ticker, s]));
  }
  const stocks = rowsToStocks(rows);
  if (stocks.length > 0) writeCache(cacheKey, stocks);
  return new Map(stocks.map((s) => [s.ticker, s]));
}

/** Full Finviz ticker universe (ticker + company), cached for a day. */
export async function getUniverse(): Promise<TickerSearchResult[]> {
  const cacheKey = "finviz-universe";
  const fresh = readCache<TickerSearchResult[]>(cacheKey, UNIVERSE_TTL);
  if (fresh) return fresh;

  const url = buildUrl({ c: "1,2" });
  const rows = await fetchCsv(url);
  if (!rows) return readCache<TickerSearchResult[]>(cacheKey) ?? [];

  const list = rows
    .slice(1)
    .map((r) => ({ ticker: str(r[0]), company: str(r[1]) }))
    .filter((t) => t.ticker);
  if (list.length > 0) writeCache(cacheKey, list);
  return list;
}

/** Ticker searcher over the Finviz universe: prefix matches on the symbol
 *  rank first, then company-name substring matches. */
export async function searchTickers(
  query: string,
  limit = 15
): Promise<TickerSearchResult[]> {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const universe = await getUniverse();

  const symStarts: TickerSearchResult[] = [];
  const symContains: TickerSearchResult[] = [];
  const nameContains: TickerSearchResult[] = [];
  for (const t of universe) {
    const sym = t.ticker.toUpperCase();
    if (sym === q || sym.startsWith(q)) symStarts.push(t);
    else if (sym.includes(q)) symContains.push(t);
    else if (t.company.toUpperCase().includes(q)) nameContains.push(t);
    if (symStarts.length >= limit) break;
  }
  return [...symStarts, ...symContains, ...nameContains].slice(0, limit);
}
