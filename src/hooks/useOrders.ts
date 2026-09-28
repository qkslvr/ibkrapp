"use client";

import { useQuery } from "@tanstack/react-query";
import { Order } from "@/types";

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await fetch("/api/ibkr/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}
