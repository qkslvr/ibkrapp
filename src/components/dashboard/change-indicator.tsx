"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ChangeIndicatorProps {
  value: number;
  percentage?: number;
  showIcon?: boolean;
  showValue?: boolean;
  showPercentage?: boolean;
  prefix?: string;
  className?: string;
  size?: "xs" | "sm" | "md";
}

export function ChangeIndicator({
  value,
  percentage,
  showIcon = true,
  showValue = true,
  showPercentage = true,
  prefix = "$",
  className,
  size = "sm",
}: ChangeIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
  };

  const iconSizes = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 font-medium",
        sizeClasses[size],
        isPositive && "text-[oklch(0.72_0.19_145)]",
        isNegative && "text-[oklch(0.65_0.22_25)]",
        !isPositive && !isNegative && "text-muted-foreground",
        className
      )}
    >
      {showIcon && (
        <>
          {isPositive && <TrendingUp className={iconSizes[size]} />}
          {isNegative && <TrendingDown className={iconSizes[size]} />}
          {!isPositive && !isNegative && <Minus className={iconSizes[size]} />}
        </>
      )}

      {showValue && (
        <span className="font-mono">
          {isPositive && "+"}
          {prefix}
          {Math.abs(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      )}

      {showPercentage && percentage !== undefined && (
        <span className="font-mono opacity-80">
          ({isPositive && "+"}
          {percentage.toFixed(2)}%)
        </span>
      )}
    </div>
  );
}
