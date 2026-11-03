import { NextResponse } from "next/server";
import { getIndex, ensureFresh } from "@/lib/screener-index-job";
import { SCREENS, getScreen, DEFAULT_SCREEN, inScope, type ScreenStock } from "@/lib/screens";
import { readMembership, pairKey } from "@/lib/screener-membership";

// Virtual screen: the union of every screen, with a "which screens" column.
export const ALL_SCREEN = "all";
const ALL_META = {
  id: ALL_SCREEN,
  name: "All Screens",
  tagline: "Every name that matches at least one screen, tagged with its screens",
  rule: "Union of all screens below. Sort by screen count, market cap or price; filter by screen with the dropdown in the table.",
  defaultSort: "screens",
  metrics: [] as { key: string; label: string; hint?: string; fmt: string }[],
};

// Applies the selected screen to the cached index and returns only the matches,
// with each screen's highlight metrics precomputed. Self-heals: a stale/missing
// index kicks off a background rebuild (the heavy work normally runs nightly).
export async function GET(request: Request) {
  ensureFresh();

  const id = new URL(request.url).searchParams.get("id") || ALL_SCREEN;
  const combined = id === ALL_SCREEN;
  const screen = getScreen(id) ?? getScreen(DEFAULT_SCREEN)!;
  const catalog = [
    { id: ALL_SCREEN, name: ALL_META.name, tagline: ALL_META.tagline },
    ...SCREENS.map((s) => ({ id: s.id, name: s.name, tagline: s.tagline })),
  ];
  const meta = combined ? ALL_META : {
    id: screen.id,
    name: screen.name,
    tagline: screen.tagline,
    rule: screen.rule,
    defaultSort: screen.defaultSort,
    metrics: screen.metrics.map((m) => ({ key: m.key, label: m.label, hint: m.hint, fmt: m.fmt })),
  };

  const index = getIndex();
  if (!index) {
    return NextResponse.json({
      status: "computing", computedAt: Date.now(), total: 0, done: 0,
      screens: catalog, screen: meta, matched: 0, rows: [],
    });
  }

  const firstSeen = readMembership()?.firstSeen ?? {};
  const base = (s: ScreenStock) => ({
    symbol: s.symbol,
    company: s.company,
    country: s.country,
    sector: s.sector,
    price: s.price,
    marketCap: s.marketCap,
    pe: s.pe,
  });

  if (combined) {
    const rows = index.stocks
      .filter(inScope)
      .map((s) => {
        const hits = SCREENS.filter((sc) => sc.match(s));
        if (!hits.length) return null;
        const dates = hits.map((sc) => firstSeen[pairKey(s.symbol, sc.id)]).filter(Boolean) as string[];
        return {
          ...base(s),
          metrics: {} as Record<string, number | null>,
          screens: hits.map((sc) => ({ id: sc.id, name: sc.name })),
          firstSeen: dates.length ? dates.sort()[dates.length - 1] : null, // most recent entry
        };
      })
      .filter((r): r is NonNullable<typeof r> => r != null)
      .sort((a, b) => b.screens.length - a.screens.length || (b.marketCap ?? 0) - (a.marketCap ?? 0));
    return NextResponse.json({
      status: index.status, computedAt: index.computedAt, total: index.total, done: index.done,
      screens: catalog, screen: meta, matched: rows.length, rows,
    });
  }

  // "cheaper/further" screens read better ascending; growth screens descending.
  const dir = screen.defaultSort.startsWith("pe") || screen.defaultSort === "below" ? 1 : -1;
  const rows = index.stocks
    .filter((s) => inScope(s) && screen.match(s))
    .map((s) => ({
      ...base(s),
      metrics: Object.fromEntries(screen.metrics.map((m) => [m.key, m.value(s)])) as Record<string, number | null>,
      firstSeen: firstSeen[pairKey(s.symbol, screen.id)] ?? null,
    }))
    .sort((a, b) => {
      const av = a.metrics[screen.defaultSort] ?? (dir === 1 ? Infinity : -Infinity);
      const bv = b.metrics[screen.defaultSort] ?? (dir === 1 ? Infinity : -Infinity);
      return (av - bv) * dir;
    });

  return NextResponse.json({
    status: index.status,
    computedAt: index.computedAt,
    total: index.total,
    done: index.done,
    screens: catalog,
    screen: meta,
    matched: rows.length,
    rows,
  });
}
