"use client";

import { useState } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { Position } from "@/types";
import { cn } from "@/lib/utils";

type Mode = "move" | "contribution";

// Heat fill tuned to the site palette: tiles start as a near-neutral slate
// (tinted toward the site's gain-green / loss-red) and deepen with intensity —
// refined rather than the harsh "traffic light" of a stock-market treemap.
function heatFill(up: boolean, t: number) {
  const c = Math.max(0.04, Math.min(t, 1));
  const hue = up ? 150 : 26;
  const L = 0.33 + 0.2 * c;    // 0.33 → 0.53
  const C = 0.035 + 0.14 * c;  // 0.035 → 0.175
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${hue})`;
}

interface Node {
  name: string;
  size: number;
  symbol: string;
  dayPct: number;
  dayChange: number;
  heat: string;
  metricLabel: string;
  [key: string]: string | number;
}

function TileContent(props: unknown) {
  const p = props as {
    x: number; y: number; width: number; height: number;
    symbol?: string; heat?: string; metricLabel?: string;
  };
  const { x, y, width, height, symbol, heat, metricLabel } = p;
  if (width <= 0 || height <= 0) return null;
  const showText = !!symbol && width > 34 && height > 18;
  const showMetric = !!symbol && width > 44 && height > 34;
  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(width - 2, 0)}
        height={Math.max(height - 2, 0)}
        rx={7}
        fill={heat ?? "oklch(0.3 0.02 268)"}
        stroke="oklch(1 0 0 / 0.06)"
        strokeWidth={1}
      />
      {showText && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showMetric ? 7 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="oklch(0.99 0 0)"
          fontSize={Math.min(14, Math.max(9.5, width / 4.6))}
          fontWeight={700}
          letterSpacing="0.02em"
          style={{ textShadow: "0 1px 2px oklch(0 0 0 / 0.45)" }}
        >
          {symbol}
        </text>
      )}
      {showMetric && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="oklch(1 0 0 / 0.82)"
          fontSize={10.5}
          fontFamily="var(--font-mono)"
        >
          {metricLabel}
        </text>
      )}
    </g>
  );
}

export function PortfolioHeatmap({ positions }: { positions: Position[] }) {
  const [mode, setMode] = useState<Mode>("move");

  const maxContribution = Math.max(...positions.map((p) => Math.abs(p.dayChange)), 1);

  const data: Node[] = positions
    .filter((p) => Math.abs(p.marketValue) > 0)
    .map((p) => {
      const up = (mode === "move" ? p.dayChangePercent : p.dayChange) >= 0;
      const t =
        mode === "move"
          ? Math.abs(p.dayChangePercent) / 4 // cap intensity at ±4%
          : Math.abs(p.dayChange) / maxContribution;
      return {
        name: p.symbol,
        size: Math.abs(p.marketValue),
        symbol: p.symbol,
        dayPct: p.dayChangePercent,
        dayChange: p.dayChange,
        heat: heatFill(up, t),
        metricLabel:
          mode === "move"
            ? `${p.dayChangePercent >= 0 ? "+" : ""}${p.dayChangePercent.toFixed(1)}%`
            : `${p.dayChange >= 0 ? "+" : "-"}$${Math.round(Math.abs(p.dayChange)).toLocaleString()}`,
      };
    })
    .sort((a, b) => b.size - a.size);

  return (
    <Card className="overflow-hidden border-border/50 bg-card/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">Portfolio Heatmap</h3>
        <div className="flex gap-0.5 rounded-md bg-secondary/50 p-0.5">
          {([["move", "Day Move"], ["contribution", "Contribution"]] as const).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] transition-colors",
                mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Tile size = position weight · color = {mode === "move" ? "that day's % move" : "$ contribution to today's change"}
      </p>

      <div className="mt-3 h-72 w-full min-w-0 overflow-hidden sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            nameKey="name"
            content={<TileContent />}
            isAnimationActive={false}
          >
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const n = payload[0].payload as Node;
                const up = n.dayPct >= 0;
                return (
                  <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold">{n.symbol}</p>
                    <p className="mt-0.5 font-mono" style={{ color: up ? "oklch(0.74 0.19 150)" : "oklch(0.66 0.21 22)" }}>
                      {n.dayPct >= 0 ? "+" : ""}{n.dayPct.toFixed(2)}% today
                    </p>
                    <p className="font-mono text-muted-foreground">
                      {n.dayChange >= 0 ? "+" : "-"}${Math.round(Math.abs(n.dayChange)).toLocaleString()} contribution
                    </p>
                    <p className="font-mono text-muted-foreground">${Math.round(n.size).toLocaleString()} value</p>
                  </div>
                );
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
