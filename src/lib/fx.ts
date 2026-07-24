// Currency conversion for cash flows reported in a non-base currency.
//
// The fund's base (reporting) currency is USD. Deposits made in another
// currency — e.g. AED wired in and converted by IBKR — must be counted at the
// USD actually credited, not their foreign face value. Counting AED 500,000 as
// "$500,000" over-issues fund units and corrupts NAV per unit for every later
// subscription.
//
// Preference order for the USD value of a foreign amount:
//   1. `fxRateToBase` from the Flex statement — IBKR's own exact rate for that
//      transaction (includes the real conversion spread). Most accurate.
//   2. A configured peg fallback (below) — used only when the statement doesn't
//      carry a rate yet. AED is hard-pegged at 3.6725 AED/USD, so this is exact
//      to within IBKR's tiny spread.
//   3. If we know neither, leave the amount unchanged and warn.

export const BASE_CURRENCY = "USD";

// 1 unit of the currency in USD (i.e. multiply a foreign amount by this).
// AED peg: 1 USD = 3.6725 AED  ->  1 AED = 1/3.6725 USD.
export const PEG_TO_USD: Record<string, number> = {
  USD: 1,
  AED: 1 / 3.6725,
};

/**
 * Convert a cash amount into USD.
 * @param amount        face amount in `currency`
 * @param currency      ISO code from the Flex statement (defaults to USD)
 * @param fxRateToBase  IBKR's per-transaction rate to base currency (0/undefined if absent)
 */
export function toUSD(
  amount: number,
  currency: string | undefined,
  fxRateToBase?: number,
): number {
  const ccy = (currency || BASE_CURRENCY).toUpperCase();
  if (ccy === BASE_CURRENCY) return amount;

  // 1. Exact rate straight from the statement.
  if (fxRateToBase && fxRateToBase > 0) return amount * fxRateToBase;

  // 2. Configured peg fallback.
  const peg = PEG_TO_USD[ccy];
  if (peg) return amount * peg;

  // 3. Unknown currency, no rate — don't silently mis-scale; keep face value.
  console.warn(`[fx] No rate for ${ccy}; treating ${amount} as USD face value`);
  return amount;
}
