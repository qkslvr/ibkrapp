"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CategoryStore } from "@/lib/categories";

const KEY = ["categories"];

export function useCategories() {
  const qc = useQueryClient();
  const query = useQuery<CategoryStore>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
    staleTime: 60_000,
  });
  const assign = useMutation({
    mutationFn: async (input: { symbol: string; category: string }) => {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to save category");
      return (await res.json()) as CategoryStore;
    },
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });
  return { ...query, assign };
}
