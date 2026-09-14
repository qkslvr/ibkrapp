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

function GrowthCell({ value, pass }: { value: number | null; pass: boolean }) {
  if (value == null) return <span className="text-muted-foreground/40">—</span>;
  const neg = value < 0;
  return (
    <span
      className="inline-flex items-center gap-1 font-mono tabular-nums"
      style={{ color: pass ? GOLD : neg ? LOSS : undefined }}
    >
      {pass && <span className="text-[10px]">✓</span>}
      {value >= 0 ? "+" : ""}
      {value.toFixed(0)}%
    </span>
  );
}

function ScorePips({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 w-4 rounded-full"
            style={{ background: i < score ? GOLD : "oklch(1 0 0 / 0.12)" }}
          />
        ))}
      </span>
      <span className="font-mono text-xs text-muted-foreground">{score}/4</span>
    </span>
  );
}

const val = (r: MomentumRow, k: SortKey): number | string => {
  switch (k) {
    case "symbol": return r.symbol;
    case "score": return r.m.score;
    case "marketCap": return r.marketCap ?? -1;
    default: return r.m[k] ?? -Infinity; // q2/q4/q6/q8
  }
};

export function MomentumTable({ rows }: { rows: MomentumRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState("");

  const toggle = (k: SortKey) => {
    if (k === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setDir(k === "symbol" ? "asc" : "desc");
    }
  };

  const processed = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => r.symbol.toLowerCase().includes(q) || r.company.toLowerCase().includes(q))
      : rows;
    const mul = dir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const av = val(a, sortKey);
      const bv = val(b, sortKey);
      if (typeof av === "string" || typeof bv === "string")
        return String(av).localeCompare(String(bv)) * mul;
      return (av - bv) * mul;
    });
    return { total: filtered.length, rows: sorted.slice(0, RENDER_CAP) };
  }, [rows, filter, sortKey, dir]);

  const Th = ({ k, label, hint }: { k: SortKey; label: string; hint?: string }) => {
    const active = sortKey === k;
    return (
      <th className="px-3 py-3 text-right font-medium">
        <button
          onClick={() => toggle(k)}
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap uppercase tracking-wide hover:text-foreground",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {label}
          {hint && <span className="text-muted-foreground/60 normal-case">{hint}</span>}
          {active ? (
            dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter ticker or company…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 bg-secondary/50 pl-9 text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {processed.total > RENDER_CAP
            ? `Showing top ${RENDER_CAP} of ${processed.total.toLocaleString()}`
            : `${processed.total.toLocaleString()} stocks`}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-xs">
              <th className="w-8 py-3 pl-4 text-right font-medium uppercase tracking-wide text-muted-foreground">#</th>
              <th className="px-3 py-3 text-left font-medium">
                <button onClick={() => toggle("symbol")} className={cn("inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground", sortKey === "symbol" ? "text-foreground" : "text-muted-foreground")}>
                  Ticker
                  {sortKey === "symbol" ? (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                </button>
              </th>
              <Th k="q2" label="2Q" hint={`>${THRESHOLDS.q2}%`} />
              <Th k="q4" label="4Q" hint={`>${THRESHOLDS.q4}%`} />
              <Th k="q6" label="6Q" hint={`>${THRESHOLDS.q6}%`} />
              <Th k="q8" label="8Q" hint={`>${THRESHOLDS.q8}%`} />
              <Th k="score" label="Score" />
              <Th k="marketCap" label="Mkt Cap" />
            </tr>
          </thead>
          <tbody>
            {processed.rows.map((r, i) => (
              <tr
                key={r.symbol}
                className={cn(
                  "border-b border-border/40 transition-colors hover:bg-accent/40 [&_td]:px-3 [&_td]:py-2.5",
                  r.m.score === 4 && "bg-primary/[0.04]",
                )}
              >
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
