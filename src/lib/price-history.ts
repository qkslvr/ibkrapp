// Daily close-price history per ticker, used by the mcap-runup / 52-week screens
// (Finviz doesn't expose a 30-day low, and Finnhub candles are paywalled).
//
// Seeded once from a local Yahoo backfill (`.cache/price_history.json`), then the
// nightly index job appends today's Finviz close. Prices are split/however Yahoo
// reported them; runup ratios are price-relative so that's fine. Since shares
// barely move over 30–60 days, a price ratio ≈ the market-cap ratio the screens
// ask for.
import { readCache, writeCache } from "@/lib/cache";

const KEY = "price_history";
const MAX_DAYS = 400; // ~13 months, enough for a 52-week window with slack

// { [symbol]: [ [ "YYYY-MM-DD", close ], ... ] } — oldest-first.
type History = Record<string, [string, number][]>;

export interface PriceStats {
  low30: number | null; // lowest close in the last 30 calendar days
  low60: number | null; // lowest close in the last 60 calendar days
  high52w: number | null; // highest close in the last 365 calendar days
}

function load(): History {
  return readCache<History>(KEY) ?? {};
}

const daysAgoISO = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/** Append today's close for each symbol and trim to MAX_DAYS. Idempotent per day. */
export function appendDailyPrices(quotes: { symbol: string; price: number | null }[]): void {
  const hist = load();
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = daysAgoISO(MAX_DAYS);
  for (const { symbol, price } of quotes) {
    if (price == null || !Number.isFinite(price)) continue;
    const series = hist[symbol] ?? (hist[symbol] = []);
    if (series.length && series[series.length - 1][0] === today) {
      series[series.length - 1][1] = price; // overwrite same-day
    } else {
      series.push([today, price]);
    }
    if (series[0][0] < cutoff) hist[symbol] = series.filter(([d]) => d >= cutoff);
  }
  writeCache(KEY, hist);
}

/** Rolling lows/high for one symbol, or nulls if we have no history for it yet. */
export function priceStats(symbol: string): PriceStats {
  const series = load()[symbol];
  if (!series?.length) return { low30: null, low60: null, high52w: null };
  const c30 = daysAgoISO(30), c60 = daysAgoISO(60), c365 = daysAgoISO(365);
  let low30: number | null = null, low60: number | null = null, high52w: number | null = null;
  for (const [d, p] of series) {
    if (d >= c365) high52w = high52w == null ? p : Math.max(high52w, p);
    if (d >= c60) low60 = low60 == null ? p : Math.min(low60, p);
    if (d >= c30) low30 = low30 == null ? p : Math.min(low30, p);
  }
  return { low30, low60, high52w };
}

/** Pre-index every symbol's stats once (cheaper than re-scanning per lookup). */
export function allPriceStats(): Map<string, PriceStats> {
  const hist = load();
  const c30 = daysAgoISO(30), c60 = daysAgoISO(60), c365 = daysAgoISO(365);
  const out = new Map<string, PriceStats>();
  for (const [symbol, series] of Object.entries(hist)) {
    let low30: number | null = null, low60: number | null = null, high52w: number | null = null;
    for (const [d, p] of series) {
      if (d >= c365) high52w = high52w == null ? p : Math.max(high52w, p);
      if (d >= c60) low60 = low60 == null ? p : Math.min(low60, p);
      if (d >= c30) low30 = low30 == null ? p : Math.min(low30, p);
    }
    out.set(symbol, { low30, low60, high52w });
  }
  return out;
}
