import { readCache, writeCache } from "@/lib/cache";

export interface PortfolioHistoryPoint {
  date: string; // "YYYY-MM-DD"
  value: number;
}

const CACHE_KEY = "portfolio_history";

// The fund's inception: the day the account reached its (so far only) deposit.
// Overridable via env if the real start ever needs correcting.
export const NAV_START_DATE = process.env.IBKR_NAV_START_DATE || "2026-02-13";
export const NAV_START_VALUE = Number(process.env.IBKR_NAV_START_VALUE || 1_000_000);

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getPortfolioHistory(): PortfolioHistoryPoint[] {
  const history = readCache<PortfolioHistoryPoint[]>(CACHE_KEY);
  if (!history || history.length === 0) {
    return [{ date: NAV_START_DATE, value: NAV_START_VALUE }];
  }
  return history;
}

// Idempotently records today's portfolio value — one row per calendar day.
// Safe to call on every real page load: revisits the same day just refresh
// that day's row with the latest known value instead of adding a duplicate.
// No new transaction has occurred beyond the original deposit, so day-to-day
// movement here is pure market value change, not unit dilution.
export function recordSnapshot(currentValue: number): PortfolioHistoryPoint[] {
  if (!currentValue || currentValue <= 0) return getPortfolioHistory();

  const history = getPortfolioHistory();
  const today = todayStr();
  const existingIdx = history.findIndex((p) => p.date === today);

  if (existingIdx >= 0) {
    if (history[existingIdx].value === currentValue) return history;
    history[existingIdx] = { date: today, value: currentValue };
  } else {
    history.push({ date: today, value: currentValue });
  }

  history.sort((a, b) => a.date.localeCompare(b.date));
  writeCache(CACHE_KEY, history);
  return history;
}
