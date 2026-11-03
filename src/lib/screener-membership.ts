// Tracks which stocks sit in which screens from one index build to the next, so
// the UI can flag fresh entrants and the nightly alert can list only the names
// that are NEW to any screen since the previous build.
import { readCache, writeCache } from "@/lib/cache";
import { SCREENS, type ScreenStock } from "@/lib/screens";
import type { ScreenerIndex } from "@/lib/screener-index-job";

export interface MembershipSnapshot {
  updatedAt: number; // ms
  members: Record<string, string[]>; // symbol -> screen ids (current)
  firstSeen: Record<string, string>; // "SYMBOL|screenId" -> ISO date the pair first appeared
}

export interface NewEntrant {
  symbol: string;
  screenId: string;
  stock: ScreenStock;
}

const CACHE_KEY = "screener_members";
export const pairKey = (symbol: string, screenId: string) => `${symbol}|${screenId}`;

export function readMembership(): MembershipSnapshot | null {
  return readCache<MembershipSnapshot>(CACHE_KEY);
}

/** symbol -> ids of every screen the stock currently matches. */
export function membershipOf(stocks: ScreenStock[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const s of stocks) {
    const ids = SCREENS.filter((sc) => sc.match(s)).map((sc) => sc.id);
    if (ids.length) out.set(s.symbol, ids);
  }
  return out;
}

/** Compare the index against the stored snapshot, persist the new snapshot (unless
 *  persist=false, for dry runs), and
 *  return the (symbol, screen) pairs that were not in the previous one. On the
 *  very first run there is no baseline, so nothing is reported as new. */
export function recordMembership(index: ScreenerIndex, persist = true): {
  firstRun: boolean;
  newEntrants: NewEntrant[];
  snapshot: MembershipSnapshot;
} {
  const prev = readMembership();
  const today = new Date().toISOString().slice(0, 10);
  const current = membershipOf(index.stocks);
  const bySymbol = new Map(index.stocks.map((s) => [s.symbol, s]));

  const firstSeen: Record<string, string> = {};
  const newEntrants: NewEntrant[] = [];
  for (const [symbol, ids] of current) {
    for (const id of ids) {
      const k = pairKey(symbol, id);
      const seen = prev?.firstSeen[k];
      // Pairs present in the first-ever snapshot have no known entry date; only
      // names that arrive after a baseline exists get dated (and flagged New).
      const entered = prev != null && !prev.members[symbol]?.includes(id);
      if (seen) firstSeen[k] = seen;
      else if (entered) firstSeen[k] = today;
      if (entered) {
        newEntrants.push({ symbol, screenId: id, stock: bySymbol.get(symbol)! });
      }
    }
  }

  const snapshot: MembershipSnapshot = {
    updatedAt: Date.now(),
    members: Object.fromEntries(current),
    firstSeen,
  };
  if (persist) writeCache(CACHE_KEY, snapshot);
  return { firstRun: !prev, newEntrants, snapshot };
}
