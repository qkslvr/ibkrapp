"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Company logo for a ticker. Finviz doesn't expose a logo endpoint, so we use
// Financial Modeling Prep's public logo images (full coverage of our holdings)
// and fall back to the ticker initials if an image is missing.
export function StockLogo({
  symbol,
  size = 32,
  className,
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const dim = { width: size, height: size };

  if (errored || !symbol) {
    return (
      <div
        style={dim}
        className={cn(
          "flex items-center justify-center rounded-lg bg-secondary text-xs font-bold",
          className,
        )}
      >
        {symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://financialmodelingprep.com/image-stock/${symbol}.png`}
      alt={symbol}
      style={dim}
      onError={() => setErrored(true)}
      className={cn("rounded-lg bg-white object-contain p-0.5", className)}
    />
  );
}
