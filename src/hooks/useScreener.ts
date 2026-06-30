"use client";

import { useQuery } from "@tanstack/react-query";
import { ScreenerStock } from "@/types";

export type ScreenerIndex = "sp500" | "ndx" | "dji" | "all";

export function useScreener(index: ScreenerIndex) {
  return useQuery<{ stocks: ScreenerStock[] }>({
    queryKey: ["screener", index],
    queryFn: async () => {
      const res = await fetch(`/api/market/screener?index=${index}`);
      if (!res.ok) return { stocks: [] };
      return res.json();
    },
    staleTime: 30 * 60_000, // 30 min — matches server cache TTL
  });
}
