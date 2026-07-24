"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  prefix?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  prefix = "$",
  className,
  size = "md",
}: MetricCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change === 0;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border",
        "border-border/60 bg-card/60 backdrop-blur-sm",
        className
      )}
    >
      {/* Subtle gradient wash keyed to the metric's direction */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-[0.06] transition-opacity group-hover:opacity-[0.1]",
          isPositive && "bg-gradient-to-br from-[oklch(0.72_0.19_145)] to-transparent",
          isNegative && "bg-gradient-to-br from-[oklch(0.65_0.22_25)] to-transparent",
          isNeutral && "bg-gradient-to-br from-[oklch(0.72_0.15_255)] to-transparent"
        )}
      />
      {/* Top hairline accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>

        <p
          className={cn(
            "mt-1 font-mono font-semibold tracking-tight",
            size === "sm" && "text-lg",
            size === "md" && "text-2xl",
            size === "lg" && "text-3xl"
          )}
        >
          {prefix}
          {value}
        </p>

        {change !== undefined && (
          <div
            className={cn(
              "mt-2 flex items-center gap-1 text-sm font-medium",
              isPositive && "text-[oklch(0.72_0.19_145)]",
              isNegative && "text-[oklch(0.65_0.22_25)]",
              isNeutral && "text-muted-foreground"
            )}
          >
            {isPositive && <TrendingUp className="h-3.5 w-3.5" />}
            {isNegative && <TrendingDown className="h-3.5 w-3.5" />}
            {isNeutral && <Minus className="h-3.5 w-3.5" />}
            <span>
              {isPositive && "+"}
              {change.toFixed(2)}%
            </span>
            {changeLabel && (
              <span className="text-muted-foreground">· {changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
