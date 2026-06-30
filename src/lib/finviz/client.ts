import { readCache, writeCache } from "@/lib/cache";
import { ScreenerStock, TickerSearchResult } from "@/types";

// Finviz Elite CSV export. NOTE: the host 301-redirects /export.ashx -> /export.
const BASE = "https://elite.finviz.com/export";
const API_KEY = process.env.FINVIZ_API_KEY || "";

// Custom-view (v=152) column indices we request. The export echoes columns in
// this order with named headers; we still parse by header name to be robust.
const COLUMN_INDICES = [
  1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 14, 16, 17, 18, 19, 21, 22, 23, 32, 33, 39,
  40, 41, 44, 46, 47, 62, 65, 66, 67, 68,
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
