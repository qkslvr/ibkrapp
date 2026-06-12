"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const KEY = ["watchlist"];

export function useWatchlist() {
  return useQuery<string[]>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await fetch("/api/watchlist");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (symbol: string) => {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to add symbol");
      }
      return res.json() as Promise<string[]>;
    },
    onSuccess: (symbols) => qc.setQueryData(KEY, symbols),
  });
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (symbol: string) => {
      const res = await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove symbol");
      return res.json() as Promise<string[]>;
    },
    onSuccess: (symbols) => qc.setQueryData(KEY, symbols),
  });
}
