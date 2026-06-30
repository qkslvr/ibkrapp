"use client";

import { useQuery } from "@tanstack/react-query";
import { NAVSummary } from "@/types";

export function useNAV() {
  return useQuery<NAVSummary | null>({
    queryKey: ["nav"],
    queryFn: async () => {
      const res = await fetch("/api/nav");
      if (!res.ok) throw new Error("Failed to fetch NAV");
      return res.json();
    },
    // Only refresh on an actual page load — no background polling or focus refetches.
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
