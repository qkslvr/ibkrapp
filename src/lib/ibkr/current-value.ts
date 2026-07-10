import { ibkrClient } from "@/lib/ibkr/client";
import { transformAccountSummary } from "@/lib/ibkr/transform";
import { readCache } from "@/lib/cache";
import { PortfolioSummary } from "@/types";

// Same source as the "Total Portfolio Value" dashboard card — live if the
// gateway is authenticated, otherwise the last real value it cached.
export async function getCurrentPortfolioValue(): Promise<number> {
  const [summary, positions] = await Promise.all([
    ibkrClient.getAccountSummary(),
    ibkrClient.getPositions(),
  ]);

  if (summary) {
    return transformAccountSummary(summary, positions).totalValue;
  }
  return readCache<PortfolioSummary>("account")?.totalValue ?? 0;
}
