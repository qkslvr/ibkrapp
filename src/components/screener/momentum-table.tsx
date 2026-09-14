"use client";

import Link from "next/link";
import { StockLogo } from "@/components/ui/stock-logo";
import { formatMarketCap } from "@/lib/utils";
import { THRESHOLDS } from "@/lib/momentum";
import type { MomentumRow } from "@/app/api/market/momentum/route";
import { cn } from "@/lib/utils";

const GOLD = "oklch(0.82 0.13 90)";
const LOSS = "oklch(0.66 0.21 22)";

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

export function MomentumTable({ rows }: { rows: MomentumRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground [&_th]:px-3 [&_th]:py-3 [&_th]:font-medium">
            <th className="w-8 pl-4 text-right">#</th>
            <th className="text-left">Ticker</th>
            <th className="text-right">2Q <span className="text-muted-foreground/60">&gt;{THRESHOLDS.q2}%</span></th>
            <th className="text-right">4Q <span className="text-muted-foreground/60">&gt;{THRESHOLDS.q4}%</span></th>
            <th className="text-right">6Q <span className="text-muted-foreground/60">&gt;{THRESHOLDS.q6}%</span></th>
            <th className="text-right">8Q <span className="text-muted-foreground/60">&gt;{THRESHOLDS.q8}%</span></th>
            <th className="text-right">Score</th>
            <th className="pr-4 text-right">Mkt Cap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
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
  );
}
