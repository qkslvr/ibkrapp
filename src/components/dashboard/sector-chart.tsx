"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { SectorAllocation } from "@/types";
import { cn } from "@/lib/utils";

export interface SectorCompany {
  symbol: string;
  name: string;
  weight: number; // % of portfolio
  dayPct: number;
}

interface SectorChartProps {
  data: SectorAllocation[];
  companies?: Record<string, SectorCompany[]>;
}

const COLORS = [
  "oklch(0.72 0.16 258)", // blue
  "oklch(0.74 0.19 150)", // green
  "oklch(0.82 0.15 78)",  // amber
  "oklch(0.68 0.19 305)", // violet
  "oklch(0.68 0.2 18)",   // rose
  "oklch(0.76 0.15 200)", // cyan
  "oklch(0.7 0.18 340)",  // pink
  "oklch(0.62 0.1 260)",  // slate-blue
];

export function SectorChart({ data, companies = {} }: SectorChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const colorFor = (i: number) => COLORS[i % COLORS.length];
  const activeSector = active != null ? data[active]?.sector : null;
  const list = activeSector ? companies[activeSector] ?? [] : [];

  return (
    <Card className="border-border/50 bg-card/50 p-4">
      <h3 className="text-sm font-medium text-muted-foreground">Sector Allocation</h3>

      <div className="mt-4 flex items-center gap-5">
        {/* Donut with center label */}
        <div className="relative h-40 w-40 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={70}
                paddingAngle={2}
                dataKey="weight"
                strokeWidth={0}
                onMouseEnter={(_, i) => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.sector}
                    fill={colorFor(index)}
                    opacity={active == null || active === index ? 1 : 0.35}
                    className="transition-opacity"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-lg font-semibold">
              {activeSector ? `${data[active!].weight.toFixed(1)}%` : `${data.length}`}
            </span>
            <span className="max-w-[76px] truncate text-center text-[10px] text-muted-foreground">
              {activeSector ?? "sectors"}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1.5">
          {data.map((sector, index) => (
            <button
              key={sector.sector}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              className={cn(
                "flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left transition-colors",
                active === index ? "bg-accent/60" : "hover:bg-accent/30",
              )}
            >
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(index) }} />
              <span className="min-w-0 flex-1 text-sm leading-tight">{sector.sector}</span>
              <span className="shrink-0 pl-1 font-mono text-sm tabular-nums text-muted-foreground">{sector.weight.toFixed(1)}%</span>
            </button>
          ))}
        </div>
      </div>

      {/* Holdings in the hovered sector */}
      <div className="mt-3 min-h-[52px] border-t border-border/50 pt-3">
        {activeSector ? (
          <div className="flex flex-wrap gap-1.5">
            {list.length > 0 ? (
              list
                .slice()
                .sort((a, b) => b.weight - a.weight)
                .map((c) => {
                  const up = c.dayPct >= 0;
                  return (
                    <span
                      key={c.symbol}
                      className="inline-flex items-center gap-1.5 rounded-md bg-secondary/60 px-2 py-1 text-xs"
                      title={c.name}
                    >
                      <span className="font-semibold">{c.symbol}</span>
                      <span className="text-muted-foreground">{c.weight.toFixed(1)}%</span>
                      <span className="font-mono" style={{ color: up ? "oklch(0.74 0.19 150)" : "oklch(0.66 0.21 22)" }}>
                        {up ? "+" : ""}{c.dayPct.toFixed(1)}%
                      </span>
                    </span>
                  );
                })
            ) : (
              <span className="text-xs text-muted-foreground">No holdings listed for this sector.</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Hover a sector to see its holdings.</p>
        )}
      </div>
    </Card>
  );
}
