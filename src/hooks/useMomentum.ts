"use client";

import { useQuery } from "@tanstack/react-query";
import type { MomentumJob } from "@/lib/momentum-job";

export function useMomentum() {
  return useQuery<MomentumJob>({
    queryKey: ["momentum"],
    queryFn: async () => {
      const res = await fetch("/api/market/momentum");
      if (!res.ok) throw new Error("Failed to load momentum");
      return res.json();
    },
    // Poll fast while a scoring pass is running, and check periodically when idle
    // so the nightly refresh shows up without a manual reload.
    refetchInterval: (query) =>
      query.state.data?.status === "computing" ? 5000 : 5 * 60_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}
