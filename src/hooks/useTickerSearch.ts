"use client";

import { useQuery } from "@tanstack/react-query";
import { TickerSearchResult } from "@/types";

export function useTickerSearch(query: string) {
  const q = query.trim();
  return useQuery<{ results: TickerSearchResult[] }>({
    queryKey: ["ticker-search", q.toUpperCase()],
    queryFn: async () => {
      const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return { results: [] };
      return res.json();
    },
    enabled: q.length >= 1,
    staleTime: 5 * 60_000,
  });
}
