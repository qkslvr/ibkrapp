"use client";

import { useQuery } from "@tanstack/react-query";
import type { Fmt } from "@/lib/screens";

export interface ScreenMetricMeta {
  key: string;
  label: string;
  hint?: string;
  fmt: Fmt;
}
export interface ScreenRow {
  symbol: string;
  company: string;
  country: string | null;
  price: number | null;
  marketCap: number | null;
  pe: number | null;
  metrics: Record<string, number | null>;
}
export interface ScreensResponse {
  status: "computing" | "ready";
  computedAt: number;
  total: number;
  done: number;
  screens: { id: string; name: string; tagline: string }[];
  screen: {
    id: string;
    name: string;
    tagline: string;
    rule: string;
    defaultSort: string;
    metrics: ScreenMetricMeta[];
  };
  matched: number;
  rows: ScreenRow[];
}

export function useScreens(id: string) {
  return useQuery<ScreensResponse>({
    queryKey: ["screens", id],
    queryFn: async () => {
      const res = await fetch(`/api/market/screens?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("Failed to load screen");
      return res.json();
    },
    // Poll fast while the nightly index is still building; idle otherwise.
    refetchInterval: (q) => (q.state.data?.status === "computing" ? 5000 : 5 * 60_000),
    refetchOnWindowFocus: true,
    staleTime: 0,
    placeholderData: (prev) => prev, // keep the table while switching screens
  });
}
