"use client";

import { useQuery } from "@tanstack/react-query";
import { PerformanceDataPoint } from "@/types";

interface PerformanceResponse {
  data: PerformanceDataPoint[];
  startValue: number;
}

export function usePerformance(period: string = "1M") {
  return useQuery<PerformanceResponse>({
    queryKey: ["performance", period],
    queryFn: async () => {
      const res = await fetch(`/api/ibkr/performance?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch performance");
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
