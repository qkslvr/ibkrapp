"use client";

import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@/types";

export function useTransactions(days = 90) {
  return useQuery<Transaction[]>({
    queryKey: ["transactions", days],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
