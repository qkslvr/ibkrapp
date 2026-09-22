import { NextResponse } from "next/server";
import { getIndex, ensureFresh } from "@/lib/screener-index-job";
import { SCREENS, getScreen, DEFAULT_SCREEN } from "@/lib/screens";

// Applies the selected screen to the cached index and returns only the matches,
// with each screen's highlight metrics precomputed. Self-heals: a stale/missing
// index kicks off a background rebuild (the heavy work normally runs nightly).
export async function GET(request: Request) {
  ensureFresh();

  const id = new URL(request.url).searchParams.get("id") || DEFAULT_SCREEN;
  const screen = getScreen(id) ?? getScreen(DEFAULT_SCREEN)!;
  const catalog = SCREENS.map((s) => ({ id: s.id, name: s.name, tagline: s.tagline }));
  const meta = {
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

  // "cheaper/further" screens read better ascending; growth screens descending.
  const dir = screen.defaultSort.startsWith("pe") || screen.defaultSort === "below" ? 1 : -1;
  const rows = index.stocks
    .filter((s) => screen.match(s))
    .map((s) => ({
      symbol: s.symbol,
      company: s.company,
      country: s.country,
      price: s.price,
      marketCap: s.marketCap,
      pe: s.pe,
      metrics: Object.fromEntries(screen.metrics.map((m) => [m.key, m.value(s)])) as Record<string, number | null>,
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
