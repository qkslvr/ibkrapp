"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StockLogo } from "@/components/ui/stock-logo";
import { Input } from "@/components/ui/input";
import { formatMarketCap, cn } from "@/lib/utils";
import type { ScreenRow, ScreenMetricMeta } from "@/hooks/useScreens";
import type { Fmt } from "@/lib/screens";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const GOLD = "oklch(0.82 0.13 90)";
const GAIN = "oklch(0.74 0.19 150)";
const LOSS = "oklch(0.66 0.21 22)";
const RENDER_CAP = 400;

function fmtVal(v: number | null, fmt: Fmt): { text: string; color?: string } {
  if (v == null || Number.isNaN(v)) return { text: "—" };
  switch (fmt) {
    case "mult": return { text: `${v.toFixed(2)}×`, color: GOLD };
    case "pct": return { text: `${v >= 0 ? "" : ""}${v.toFixed(0)}%` };
    case "belowpct": return { text: `${v.toFixed(0)}%`, color: LOSS };
    case "price": return { text: `$${v.toFixed(2)}` };
    case "money": return { text: formatMarketCap(v) };
    default: return { text: String(v) };
  }
}

type Col = {
  key: string;
  label: string;
  hint?: string;
  align: "left" | "right";
  num: (r: ScreenRow) => number | null;
  render: (r: ScreenRow) => React.ReactNode;
};

export function ScreensTable({ rows, metrics, defaultSort }: {
  rows: ScreenRow[];
  metrics: ScreenMetricMeta[];
  defaultSort: string;
}) {
  const [sortKey, setSortKey] = useState<string>(defaultSort);
  const [dir, setDir] = useState<"asc" | "desc">(
    defaultSort.startsWith("pe") || defaultSort === "below" ? "asc" : "desc",
  );
  const [text, setText] = useState("");

  // reset the sort when the screen (its default) changes
  useEffect(() => {
    setSortKey(defaultSort);
    setDir(defaultSort.startsWith("pe") || defaultSort === "below" ? "asc" : "desc");
  }, [defaultSort]);

  const cols: Col[] = useMemo(() => {
    const metricCols: Col[] = metrics.map((m) => ({
      key: m.key,
      label: m.label,
      hint: m.hint,
      align: "right",
      num: (r) => r.metrics[m.key] ?? null,
      render: (r) => {
        const { text: t, color } = fmtVal(r.metrics[m.key] ?? null, m.fmt);
        return <span className="font-mono tabular-nums" style={{ color }}>{t}</span>;
      },
    }));
    return [
      ...metricCols,
      { key: "pe", label: "P/E", align: "right", num: (r) => r.pe,
        render: (r) => <span className="font-mono tabular-nums text-muted-foreground">{r.pe != null ? r.pe.toFixed(1) : "—"}</span> },
      { key: "price", label: "Price", align: "right", num: (r) => r.price,
        render: (r) => <span className="font-mono tabular-nums text-muted-foreground">{r.price != null ? `$${r.price.toFixed(2)}` : "—"}</span> },
      { key: "marketCap", label: "Mkt Cap", align: "right", num: (r) => r.marketCap,
        render: (r) => <span className="font-mono tabular-nums text-muted-foreground">{formatMarketCap(r.marketCap ?? 0)}</span> },
    ];
  }, [metrics]);

  const toggle = (k: string) => {
    if (k === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setDir(k === "symbol" ? "asc" : "desc"); }
  };

  const processed = useMemo(() => {
    const q = text.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (!q) return true;
      return (
        r.symbol.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        (r.sector ?? "").toLowerCase().includes(q)
      );
    });
    const mul = dir === "asc" ? 1 : -1;
    const col = cols.find((c) => c.key === sortKey);
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "symbol") return a.symbol.localeCompare(b.symbol) * mul;
      if (sortKey === "sector") return (a.sector ?? "").localeCompare(b.sector ?? "") * mul;
      const av = col?.num(a) ?? -Infinity;
      const bv = col?.num(b) ?? -Infinity;
      return (av - bv) * mul;
    });
    return { total: filtered.length, rows: sorted.slice(0, RENDER_CAP) };
  }, [rows, text, sortKey, dir, cols]);

  const SortBtn = ({ k, label, hint }: { k: string; label: string; hint?: string }) => {
    const active = sortKey === k;
    return (
      <button onClick={() => toggle(k)} className={cn("inline-flex items-center gap-1 whitespace-nowrap uppercase tracking-wide hover:text-foreground", active ? "text-foreground" : "text-muted-foreground")}>
        {label}
        {hint && <span className="normal-case text-muted-foreground/60">{hint}</span>}
        {active ? (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    );
  };

  const div = "border-l border-border/50";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-[18rem]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Filter ticker, company or sector…" value={text} onChange={(e) => setText(e.target.value)} className="h-9 bg-secondary/50 pl-9 text-sm" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {processed.total > RENDER_CAP ? `Showing top ${RENDER_CAP} of ${processed.total.toLocaleString()}` : `${processed.total.toLocaleString()} match${processed.total === 1 ? "" : "es"}`}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-xs">
              <th className="w-8 py-2 pl-4 text-right font-medium uppercase tracking-wide text-muted-foreground">#</th>
              <th className="px-3 py-2 text-left font-medium"><SortBtn k="symbol" label="Ticker" /></th>
              <th className="px-3 py-2 text-left font-medium"><SortBtn k="sector" label="Sector" /></th>
              {cols.map((c, i) => (
                <th key={c.key} className={cn("px-2.5 py-2 text-right font-medium", i === 0 && div)}>
                  <SortBtn k={c.key} label={c.label} hint={c.hint} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processed.rows.map((r, i) => (
              <tr key={r.symbol} className="border-b border-border/40 transition-colors hover:bg-accent/40 [&_td]:px-2.5 [&_td]:py-2.5">
                <td className="pl-4 text-right font-mono text-xs text-muted-foreground/70">{i + 1}</td>
                <td className="px-3">
                  <Link href={`/stock/${r.symbol}`} className="flex items-center gap-2.5">
                    <StockLogo symbol={r.symbol} size={26} className="h-[26px] w-[26px] shrink-0" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-mono font-semibold">
                        {r.symbol}
                        {r.country && r.country !== "United States" && (
                          <span className="rounded bg-secondary px-1 py-0.5 text-[9px] font-normal uppercase tracking-wide text-primary/90">{r.country}</span>
                        )}
                      </span>
                      <span className="block max-w-[160px] truncate text-xs text-muted-foreground">{r.company}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 text-left text-xs text-muted-foreground">{r.sector || "—"}</td>
                {cols.map((c, ci) => (
                  <td key={c.key} className={cn("text-right", ci === 0 && div)}>{c.render(r)}</td>
                ))}
              </tr>
            ))}
            {processed.rows.length === 0 && (
              <tr><td colSpan={cols.length + 3} className="py-10 text-center text-sm text-muted-foreground">No stocks match this screen.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
