"use client";

import { useQuery } from "@tanstack/react-query";

interface IBKRAuthStatus {
  connected: boolean;
  hasCachedData: boolean;
}

export function useIBKRAuth() {
  const { data, isLoading } = useQuery<IBKRAuthStatus>({
    queryKey: ["ibkr-auth"],
    queryFn: async () => {
      const res = await fetch("/api/ibkr/auth");
      if (!res.ok) return { connected: false, hasCachedData: false };
      return res.json();
    },
    staleTime: 5_000,
    // Poll every 5s when not connected so we detect login immediately,
    // slow down to every 60s once live
    refetchInterval: (query) => {
      return query.state.data?.connected ? 60_000 : 5_000;
    },
  });

  return {
    connected: data?.connected ?? false,
    hasCachedData: data?.hasCachedData ?? false,
    loading: isLoading,
  };
}
