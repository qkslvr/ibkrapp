"use client";

import { useQuery } from "@tanstack/react-query";
import { StockQuote } from "@/types";

export function useStockQuote(symbol: string) {
  return useQuery<StockQuote | null>({
    queryKey: ["stock-quote", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/market/quote/${symbol}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!symbol,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
