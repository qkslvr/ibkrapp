"use client";

import { useQuery } from "@tanstack/react-query";
import type { MomentumJob } from "@/app/api/market/momentum/route";

export type MomentumIndex = "sp500" | "ndx" | "dji";

export function useMomentum(index: MomentumIndex) {
  return useQuery<MomentumJob>({
    queryKey: ["momentum", index],
    queryFn: async () => {
      const res = await fetch(`/api/market/momentum?index=${index}`);
      if (!res.ok) throw new Error("Failed to load momentum");
      return res.json();
    },
    // While the background job is scoring, poll for progress; stop once ready.
    refetchInterval: (query) =>
      query.state.data?.status === "computing" ? 3000 : false,
    staleTime: 0,
  });
}
