"use client";

import { useQuery } from "@tanstack/react-query";
import { PortfolioSummary } from "@/types";

export function usePortfolioSummary() {
  return useQuery<PortfolioSummary>({
    queryKey: ["portfolio-summary"],
    queryFn: async () => {
      const res = await fetch("/api/ibkr/account");
      if (!res.ok) throw new Error("Failed to fetch account summary");
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
