"use client";

import { useQuery } from "@tanstack/react-query";
import { Position } from "@/types";

export function usePositions() {
  return useQuery<Position[]>({
    queryKey: ["positions"],
    queryFn: async () => {
      const res = await fetch("/api/ibkr/positions");
      if (!res.ok) throw new Error("Failed to fetch positions");
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
