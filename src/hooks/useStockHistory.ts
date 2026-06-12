"use client";

import { useQuery } from "@tanstack/react-query";
import { PerformanceDataPoint } from "@/types";

export function useStockHistory(symbol: string, timeframe: string = "1M") {
  return useQuery<PerformanceDataPoint[]>({
    queryKey: ["stock-history", symbol, timeframe],
    queryFn: async () => {
      const res = await fetch(`/api/market/history/${symbol}?timeframe=${timeframe}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!symbol,
    staleTime: 5 * 60_000, // 5 minutes
  });
}
