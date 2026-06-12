"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { SectorAllocation } from "@/types";

interface SectorChartProps {
  data: SectorAllocation[];
}

const COLORS = [
  "oklch(0.7 0.15 250)",   // Blue
  "oklch(0.72 0.19 145)",  // Green
  "oklch(0.8 0.15 80)",    // Yellow
  "oklch(0.65 0.2 300)",   // Purple
  "oklch(0.7 0.2 30)",     // Orange
  "oklch(0.65 0.15 200)",  // Cyan
  "oklch(0.7 0.18 350)",   // Pink
  "oklch(0.6 0.1 260)",    // Dark Blue
];

export function SectorChart({ data }: SectorChartProps) {
  return (
    <Card className="border-border/50 bg-card/50 p-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        Sector Allocation
      </h3>

      <div className="mt-4 flex items-center gap-6">
        {/* Chart */}
        <div className="h-40 w-40 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                dataKey="weight"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.sector}
                    fill={COLORS[index % COLORS.length]}
                    className="transition-opacity hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as SectorAllocation;
                    return (
                      <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-lg">
                        <p className="font-medium">{data.sector}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.weight.toFixed(1)}% · $
                          {data.value.toLocaleString()}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {data.map((sector, index) => (
            <div key={sector.sector} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="flex-1 text-sm">{sector.sector}</span>
              <span className="font-mono text-sm text-muted-foreground">
                {sector.weight.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
