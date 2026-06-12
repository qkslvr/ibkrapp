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
        "relative overflow-hidden p-4 transition-all hover:bg-accent/50",
        "border-border/50 bg-card/50 backdrop-blur-sm",
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div
        className={cn(
          "absolute inset-0 opacity-[0.03]",
          isPositive && "bg-gradient-to-br from-green-500 to-transparent",
          isNegative && "bg-gradient-to-br from-red-500 to-transparent"
        )}
      />

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
