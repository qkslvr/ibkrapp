"use client";

import { useQuery } from "@tanstack/react-query";
import { StockFundamentals, StockDividend } from "@/types";

interface FundamentalsResponse {
  fundamentals: StockFundamentals | null;
  dividend: StockDividend | null;
}

export function useStockFundamentals(symbol: string) {
  return useQuery<FundamentalsResponse>({
    queryKey: ["stock-fundamentals", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/market/fundamentals/${symbol}`);
      if (!res.ok) return { fundamentals: null, dividend: null };
      return res.json();
    },
    enabled: !!symbol,
    staleTime: 60 * 60_000, // 1 hour
  });
}
