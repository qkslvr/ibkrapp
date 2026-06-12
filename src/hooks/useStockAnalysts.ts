"use client";

import { useQuery } from "@tanstack/react-query";
import { AnalystRating } from "@/types";

export function useStockAnalysts(symbol: string) {
  return useQuery<AnalystRating | null>({
    queryKey: ["stock-analysts", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/market/analysts/${symbol}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!symbol,
    staleTime: 60 * 60_000, // 1 hour
  });
}
