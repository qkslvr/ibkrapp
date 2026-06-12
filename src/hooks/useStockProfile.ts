"use client";

import { useQuery } from "@tanstack/react-query";
import { FinnhubProfile } from "@/lib/finnhub/client";

export function useStockProfile(symbol: string) {
  return useQuery<FinnhubProfile | null>({
    queryKey: ["stock-profile", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/market/profile/${symbol}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!symbol,
    staleTime: 60 * 60_000, // 1 hour
  });
}
