"use client";

import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RiskMetrics as RiskMetricsType } from "@/types";
import { Shield, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskMetricsProps {
  data: RiskMetricsType;
}

interface MetricConfig {
  key: keyof RiskMetricsType;
  label: string;
  description: string;
  format: (v: number) => string;
  benchmark: number;
  higherIsBetter?: boolean;
}

const metrics: MetricConfig[] = [
  {
    key: "beta",
    label: "Beta",
    description: "Portfolio volatility relative to S&P 500. >1 means more volatile.",
    format: (v: number) => v.toFixed(2),
    benchmark: 1,
  },
  {
    key: "volatility",
    label: "Volatility",
    description: "30-day annualized volatility. Lower is generally better.",
    format: (v: number) => `${v.toFixed(1)}%`,
    benchmark: 20,
  },
  {
    key: "sharpeRatio",
    label: "Sharpe Ratio",
    description: "Risk-adjusted returns. Higher is better. >1 is good, >2 is excellent.",
    format: (v: number) => v.toFixed(2),
    benchmark: 1,
    higherIsBetter: true,
  },
  {
    key: "maxDrawdown",
    label: "Max Drawdown",
    description: "Largest peak-to-trough decline YTD. Lower magnitude is better.",
    format: (v: number) => `${v.toFixed(1)}%`,
    benchmark: -15,
  },
];

export function RiskMetricsWidget({ data }: RiskMetricsProps) {
  return (
    <Card className="border-border/50 bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Risk Metrics
        </h3>
      </div>

      <div className="mt-4 space-y-3">
        {metrics.map((metric) => {
          const value = data[metric.key];
          const isGood = metric.higherIsBetter
            ? value >= metric.benchmark
            : Math.abs(value) <= Math.abs(metric.benchmark);

          return (
            <div
              key={metric.key}
              className="flex items-center justify-between"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex cursor-help items-center gap-1.5">
                    <span className="text-sm">{metric.label}</span>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[200px]">
                  <p className="text-xs">{metric.description}</p>
                </TooltipContent>
              </Tooltip>

              <span
                className={cn(
                  "font-mono text-sm font-medium",
                  isGood ? "text-[oklch(0.72_0.19_145)]" : "text-[oklch(0.65_0.22_25)]"
                )}
              >
                {metric.format(value)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
