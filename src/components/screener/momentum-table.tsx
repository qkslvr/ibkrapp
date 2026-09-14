"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StockLogo } from "@/components/ui/stock-logo";
import { Input } from "@/components/ui/input";
import { formatMarketCap, cn } from "@/lib/utils";
import { THRESHOLDS } from "@/lib/momentum";
import type { MomentumRow } from "@/lib/momentum-job";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const GOLD = "oklch(0.82 0.13 90)";
const LOSS = "oklch(0.66 0.21 22)";
const RENDER_CAP = 400;

type SortKey = "symbol" | "q2" | "q4" | "q6" | "q8" | "score" | "marketCap";
type NumKey = Exclude<SortKey, "symbol">;
const NUM_COLS: NumKey[] = ["q2", "q4", "q6", "q8", "score", "marketCap"];

// Parse a filter expression like ">40", ">=100", "<10", "40" (bare = ≥).
function makePredicate(expr: string): ((v: number | null) => boolean) | null {
  const m = expr.trim().match(/^(>=|<=|>|<|=)?\s*(-?\d*\.?\d+)$/);
  if (!m) return null;
  const op = m[1] || ">=";
  const n = parseFloat(m[2]);
  return (v) => {
    if (v == null || Number.isNaN(v)) return false;
    switch (op) {
      case ">": return v > n;
      case ">=": return v >= n;
      case "<": return v < n;
      case "<=": return v <= n;
      case "=": return v === n;
      default: return false;
    }
  };
}

// Numeric value used for both sorting and column filters. Market cap is
// expressed in $B so a user can type ">10" for $10B.
function numVal(r: MomentumRow, k: NumKey): number | null {
  if (k === "score") return r.m.score;
  if (k === "marketCap") return r.marketCap != null ? r.marketCap / 1e9 : null;
  return r.m[k];
}

function GrowthCell({ value, pass }: { value: number | null; pass: boolean }) {
  if (value == null) return <span className="text-muted-foreground/40">—</span>;
  const neg = value < 0;
  return (
    <span className="inline-flex items-center gap-1 font-mono tabular-nums" style={{ color: pass ? GOLD : neg ? LOSS : undefined }}>
      {pass && <span className="text-[10px]">✓</span>}
      {value >= 0 ? "+" : ""}
      {value.toFixed(0)}%
    </span>
  );
}

// Module-level so it isn't re-created each render (which would drop focus).
function ColFilter({ value, onChange, ph }: { value: string; onChange: (v: string) => void; ph: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={ph}
      className="h-6 w-16 rounded border border-border/60 bg-background/60 px-1.5 text-right font-mono text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none"
    />
  );
}

function ScorePips({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1.5 w-4 rounded-full" style={{ background: i < score ? GOLD : "oklch(1 0 0 / 0.12)" }} />
        ))}
      </span>
      <span className="font-mono text-xs text-muted-foreground">{score}/4</span>
    </span>
  );
}

export function MomentumTable({ rows }: { rows: MomentumRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [text, setText] = useState("");
  const [colFilters, setColFilters] = useState<Partial<Record<NumKey, string>>>({});

  const toggle = (k: SortKey) => {
    if (k === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setDir(k === "symbol" ? "asc" : "desc");
    }
  };

  const activeFilters = useMemo(
    () =>
      NUM_COLS.map((k) => ({ k, pred: makePredicate(colFilters[k] ?? "") }))
        .filter((x): x is { k: NumKey; pred: (v: number | null) => boolean } => x.pred != null),
    [colFilters],
  );

  const processed = useMemo(() => {
    const q = text.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (q && !r.symbol.toLowerCase().includes(q) && !r.company.toLowerCase().includes(q)) return false;
      return activeFilters.every(({ k, pred }) => pred(numVal(r, k)));
    });
    const mul = dir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "symbol") return a.symbol.localeCompare(b.symbol) * mul;
      return ((numVal(a, sortKey) ?? -Infinity) - (numVal(b, sortKey) ?? -Infinity)) * mul;
    });
    return { total: filtered.length, rows: sorted.slice(0, RENDER_CAP) };
  }, [rows, text, activeFilters, sortKey, dir]);

  const SortBtn = ({ k, label, hint }: { k: SortKey; label: string; hint?: string }) => {
    const active = sortKey === k;
    return (
      <button
        onClick={() => toggle(k)}
        className={cn("inline-flex items-center gap-1 whitespace-nowrap uppercase tracking-wide hover:text-foreground", active ? "text-foreground" : "text-muted-foreground")}
      >
        {label}
        {hint && <span className="normal-case text-muted-foreground/60">{hint}</span>}
        {active ? (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    );
  };

  const setFilter = (k: NumKey) => (v: string) => setColFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Filter ticker or company…" value={text} onChange={(e) => setText(e.target.value)} className="h-9 bg-secondary/50 pl-9 text-sm" />
        </div>
        <p className="text-xs text-muted-foreground">
          {processed.total > RENDER_CAP ? `Showing top ${RENDER_CAP} of ${processed.total.toLocaleString()}` : `${processed.total.toLocaleString()} stocks`}
          <span className="ml-2 text-muted-foreground/60">— type e.g. <span className="font-mono">&gt;40</span> in a column filter</span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-xs">
              <th className="w-8 py-3 pl-4 text-right font-medium uppercase tracking-wide text-muted-foreground">#</th>
              <th className="px-3 py-3 text-left font-medium"><SortBtn k="symbol" label="Ticker" /></th>
              <th className="px-3 py-3 text-right font-medium"><SortBtn k="q2" label="2Q" hint={`>${THRESHOLDS.q2}%`} /></th>
              <th className="px-3 py-3 text-right font-medium"><SortBtn k="q4" label="4Q" hint={`>${THRESHOLDS.q4}%`} /></th>
              <th className="px-3 py-3 text-right font-medium"><SortBtn k="q6" label="6Q" hint={`>${THRESHOLDS.q6}%`} /></th>
              <th className="px-3 py-3 text-right font-medium"><SortBtn k="q8" label="8Q" hint={`>${THRESHOLDS.q8}%`} /></th>
              <th className="px-3 py-3 text-right font-medium"><SortBtn k="score" label="Score" /></th>
              <th className="px-3 py-3 pr-4 text-right font-medium"><SortBtn k="marketCap" label="Mkt Cap" /></th>
            </tr>
            {/* Per-column filter row */}
            <tr className="border-b border-border/60 bg-secondary/10">
              <th></th>
              <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-wide text-muted-foreground/60">filter →</th>
              <th className="px-3 py-1.5 text-right"><ColFilter value={colFilters.q2 ?? ""} onChange={setFilter("q2")} ph=">10" /></th>
              <th className="px-3 py-1.5 text-right"><ColFilter value={colFilters.q4 ?? ""} onChange={setFilter("q4")} ph=">40" /></th>
              <th className="px-3 py-1.5 text-right"><ColFilter value={colFilters.q6 ?? ""} onChange={setFilter("q6")} ph=">60" /></th>
              <th className="px-3 py-1.5 text-right"><ColFilter value={colFilters.q8 ?? ""} onChange={setFilter("q8")} ph=">100" /></th>
              <th className="px-3 py-1.5 text-right"><ColFilter value={colFilters.score ?? ""} onChange={setFilter("score")} ph=">=3" /></th>
              <th className="px-3 py-1.5 pr-4 text-right"><ColFilter value={colFilters.marketCap ?? ""} onChange={setFilter("marketCap")} ph=">10 (B)" /></th>
            </tr>
          </thead>
          <tbody>
            {processed.rows.map((r, i) => (
              <tr key={r.symbol} className={cn("border-b border-border/40 transition-colors hover:bg-accent/40 [&_td]:px-3 [&_td]:py-2.5", r.m.score === 4 && "bg-primary/[0.04]")}>
                <td className="pl-4 text-right font-mono text-xs text-muted-foreground/70">{i + 1}</td>
                <td>
                  <Link href={`/stock/${r.symbol}`} className="flex items-center gap-2.5">
                    <StockLogo symbol={r.symbol} size={26} className="h-[26px] w-[26px] shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-mono font-semibold">{r.symbol}</span>
                      <span className="block max-w-[180px] truncate text-xs text-muted-foreground">{r.company}</span>
                    </span>
                  </Link>
                </td>
                <td className="text-right"><GrowthCell value={r.m.q2} pass={r.m.pass2} /></td>
                <td className="text-right"><GrowthCell value={r.m.q4} pass={r.m.pass4} /></td>
                <td className="text-right"><GrowthCell value={r.m.q6} pass={r.m.pass6} /></td>
                <td className="text-right"><GrowthCell value={r.m.q8} pass={r.m.pass8} /></td>
                <td className="text-right"><ScorePips score={r.m.score} /></td>
                <td className="pr-4 text-right font-mono text-muted-foreground">{formatMarketCap(r.marketCap ?? 0)}</td>
              </tr>
            ))}
            {processed.rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No stocks match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
