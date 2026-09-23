import { NextResponse } from "next/server";
import { readCache, writeCache } from "@/lib/cache";
import { NAVSummary, NAVDeposit, NAVMonthlySnapshot, NAVDailyPoint } from "@/types";
import {
  fetchFlexStatement,
  parseCashTransactions,
  parseEquitySummary,
} from "@/lib/ibkr/flex";
import {
  getPortfolioHistory,
  recordSnapshot,
  mergeDailySeries,
} from "@/lib/portfolio-history";
import { getCurrentPortfolioValue } from "@/lib/ibkr/current-value";
import { toUSD } from "@/lib/fx";
import { xirr } from "@/lib/xirr";

const FLEX_ACTIVITY_QUERY_ID = process.env.IBKR_FLEX_ACTIVITY_QUERY_ID || "";
const FLEX_NAV_QUERY_ID = process.env.IBKR_FLEX_NAV_QUERY_ID || "";
const NAV_START_DATE = process.env.IBKR_NAV_START_DATE || ""; // exclude deposits before this date
// Founding batch: every deposit on/before this date subscribes at the base NAV
// of $100 (the fund's initial capital arrived as one batch — the only exception
// to pricing subscriptions at the prevailing NAV). Overridable via env.
const NAV_BATCH_UNTIL_DATE = process.env.IBKR_NAV_BATCH_UNTIL_DATE || "2026-02-13";
const CACHE_KEY = "nav_summary";
const BASE_NAV = 100; // starting NAV per unit

function parseDateStr(raw: string): string {
  const d = raw.split(";")[0].split(" ")[0];
  return d.length === 8 && !d.includes("-")
    ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
    : d;
}

export async function GET() {
  try {
    // Fetch both queries in parallel — NAV query for equity summary, activity query for deposits
    const [navXml, activityXml] = await Promise.all([
      FLEX_NAV_QUERY_ID
        ? fetchFlexStatement(FLEX_NAV_QUERY_ID).catch(() => null)
        : null,
      FLEX_ACTIVITY_QUERY_ID
        ? fetchFlexStatement(FLEX_ACTIVITY_QUERY_ID).catch(() => null)
        : null,
    ]);

    // Fall back to activity XML for equity summary if NAV query unavailable
    const equityXml = navXml ?? activityXml;

    if (!equityXml && !activityXml) {
      const cached = readCache<NAVSummary>(CACHE_KEY);
      if (cached) return NextResponse.json(cached);
      return NextResponse.json(null);
    }

    // Build daily portfolio value map from equity summary
    const equityRows = equityXml ? parseEquitySummary(equityXml) : [];
    const dailyValue: Record<string, number> = {};
    const dailyCash: Record<string, number> = {};
    for (const row of equityRows) {
      const date = parseDateStr(row.reportDate);
      if (date) {
        dailyValue[date] = row.total;
        dailyCash[date] = row.cash;
      }
    }

    // If the Flex NAV query gave us a real daily series, persist it to the
    // durable store so the portfolio-balance chart survives Flex being offline.
    if (Object.keys(dailyValue).length > 1) {
      mergeDailySeries(
        Object.entries(dailyValue).map(([date, value]) => ({ date, value })),
      );
    }

    // Flex account doesn't have an EquitySummaryByReportDateInBase section —
    // fall back to our own daily snapshot history (same store the front-page
    // performance chart uses), anchored at the deposit date. Record today's
    // value too, in case this route is hit before the dashboard chart ever is.
    if (Object.keys(dailyValue).length === 0) {
      const currentValue = await getCurrentPortfolioValue();
      const history = currentValue > 0 ? recordSnapshot(currentValue) : getPortfolioHistory();
      for (const p of history) dailyValue[p.date] = p.value;
    }

    // Get deposit events from activity query, sorted ascending by date.
    // Deposits made in a non-USD currency (e.g. AED wired in and converted) are
    // counted at the USD actually credited — using IBKR's exact fxRateToBase when
    // present, otherwise a pegged fallback. Counting the foreign face value as USD
    // would over-issue units and crash NAV per unit for every later subscription.
    const cashTxns = parseCashTransactions(activityXml ?? equityXml ?? "");
    const rawDeposits = cashTxns
      .filter((t) => t.type === "Deposits/Withdrawals" && t.amount > 0)
      .map((t) => {
        const originalCurrency = (t.currency || "USD").toUpperCase();
        const amountUSD = toUSD(t.amount, originalCurrency, t.fxRateToBase);
        return {
          date: parseDateStr(t.dateTime),
          amount: amountUSD,
          originalAmount: t.amount,
          originalCurrency,
          fxRateToUSD: t.amount !== 0 ? amountUSD / t.amount : 1,
        };
      })
      .filter((t) => !NAV_START_DATE || t.date >= NAV_START_DATE)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (rawDeposits.length === 0) {
      return NextResponse.json(null);
    }

    const sortedDates = Object.keys(dailyValue).sort();

    // Find portfolio value on the last trading day BEFORE a given date
    // (deposit day value already includes the new cash — use prior day)
    function portfolioValueBefore(date: string): number {
      let val = 0;
      for (const d of sortedDates) {
        if (d < date) val = dailyValue[d];
        else break;
      }
      return val;
    }

    // Calculate units issued per deposit at the NAV on that date.
    // NAV for a subscription is the fund's *opening* NAV that day = (prior-day
    // portfolio value) ÷ (units outstanding at the start of the day). Multiple
    // subscriptions on the same day therefore all price at that same NAV — we
    // must NOT divide the stale prior-day value by a unit count that already
    // grew from earlier same-day deposits (that wrongly craters the later
    // same-day NAV).
    let totalUnits = 0;
    let unitsBeforeDate = 0; // units outstanding at the start of `currentDate`
    let currentDate = "";
    const deposits: NAVDeposit[] = [];

    for (const dep of rawDeposits) {
      if (dep.date !== currentDate) {
        unitsBeforeDate = totalUnits; // freeze the opening unit count for this day
        currentDate = dep.date;
      }
      let navAtDeposit: number;
      if (unitsBeforeDate === 0 || dep.date <= NAV_BATCH_UNTIL_DATE) {
        // Founding batch (or very first deposit) — everyone buys in at base NAV.
        navAtDeposit = BASE_NAV;
      } else {
        const portfolioValue = portfolioValueBefore(dep.date);
        navAtDeposit = portfolioValue > 0 ? portfolioValue / unitsBeforeDate : BASE_NAV;
      }
      const unitsIssued = dep.amount / navAtDeposit;
      totalUnits += unitsIssued;
      deposits.push({
        date: dep.date,
        amount: dep.amount,
        originalAmount: dep.originalAmount,
        originalCurrency: dep.originalCurrency,
        fxRateToUSD: dep.fxRateToUSD,
        navAtDeposit,
        unitsIssued,
      });
    }

    // Build monthly snapshots using end-of-month portfolio values
    const monthly: NAVMonthlySnapshot[] = [];
    const monthSet = new Set<string>();

    // Collect all months we have equity data for
    for (const date of Object.keys(dailyValue)) {
      monthSet.add(date.slice(0, 7));
    }

    const sortedMonths = [...monthSet].sort();
    const firstEquityMonth = sortedMonths[0] ?? "";

    // Pre-seed units from all deposits that occurred before our equity data starts
    let runningUnits = deposits
      .filter((d) => d.date.slice(0, 7) < firstEquityMonth)
      .reduce((s, d) => s + d.unitsIssued, 0);

    // Group remaining deposits by the month they fall in
    const depositsByMonth: Record<string, NAVDeposit[]> = {};
    for (const dep of deposits.filter((d) => d.date.slice(0, 7) >= firstEquityMonth)) {
      const m = dep.date.slice(0, 7);
      if (!depositsByMonth[m]) depositsByMonth[m] = [];
      depositsByMonth[m].push(dep);
    }

    for (const month of sortedMonths) {
      // Add any units issued during this month
      for (const dep of depositsByMonth[month] ?? []) {
        runningUnits += dep.unitsIssued;
      }
      if (runningUnits === 0) continue;

      // Find the last equity date in this month
      const datesInMonth = Object.keys(dailyValue)
        .filter((d) => d.startsWith(month))
        .sort();
      if (datesInMonth.length === 0) continue;

      const lastDate = datesInMonth[datesInMonth.length - 1];
      const portfolioValue = dailyValue[lastDate];
      const nav = portfolioValue / runningUnits;

      monthly.push({
        month,
        portfolioValue,
        totalUnits: runningUnits,
        nav,
        returnPct: ((nav - BASE_NAV) / BASE_NAV) * 100,
      });
    }

    // Daily portfolio balance & NAV — one row per day we have a balance for,
    // so the report shows exactly how NAV per unit is derived (balance ÷ units
    // outstanding as of that day). On a deposit day both the balance and the
    // unit count step up together, so NAV stays continuous.
    const daily: NAVDailyPoint[] = [];
    let prevNav = 0;
    for (const date of sortedDates) {
      const unitsAsOf = deposits
        .filter((d) => d.date <= date)
        .reduce((s, d) => s + d.unitsIssued, 0);
      if (unitsAsOf === 0) continue;
      const portfolioValue = dailyValue[date];
      const nav = portfolioValue / unitsAsOf;
      const navChangePct = prevNav > 0 ? ((nav - prevNav) / prevNav) * 100 : 0;
      daily.push({
        date,
        portfolioValue,
        totalUnits: unitsAsOf,
        nav,
        returnPct: ((nav - BASE_NAV) / BASE_NAV) * 100,
        navChangePct,
      });
      prevNav = nav;
    }

    // Risk metrics from the fund's own daily NAV/unit series (the authoritative
    // return stream — already net of flows, since NAV/unit is flow-neutral).
    const dailyReturns = daily.slice(1).map((d) => d.navChangePct / 100);
    let volatility = 0;
    let sharpeRatio = 0;
    if (dailyReturns.length >= 2) {
      const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
      const variance =
        dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
      const std = Math.sqrt(variance);
      volatility = +(std * Math.sqrt(252) * 100).toFixed(2);
      // Risk-free ~0 for this horizon; annualise the Sharpe.
      sharpeRatio = std > 0 ? +((mean / std) * Math.sqrt(252)).toFixed(2) : 0;
    }
    // Max drawdown over the NAV/unit path (peak-to-trough, %).
    let peak = -Infinity;
    let maxDrawdown = 0;
    for (const d of daily) {
      if (d.nav > peak) peak = d.nav;
      if (peak > 0) {
        const dd = ((d.nav - peak) / peak) * 100;
        if (dd < maxDrawdown) maxDrawdown = dd;
      }
    }
    maxDrawdown = +maxDrawdown.toFixed(2);

    // Dividend income received year-to-date (from the Flex cash transactions),
    // converted to USD like everything else.
    const thisYear = new Date().getFullYear().toString();
    const dividendYtd = cashTxns
      .filter((t) => t.type === "Dividends" && t.amount > 0 && parseDateStr(t.dateTime).startsWith(thisYear))
      .reduce((s, t) => s + toUSD(t.amount, t.currency, t.fxRateToBase), 0);

    // Current state
    const latestDates = Object.keys(dailyValue).sort();
    const latestValue =
      latestDates.length > 0 ? dailyValue[latestDates[latestDates.length - 1]] : 0;
    const currentNAV = totalUnits > 0 ? latestValue / totalUnits : BASE_NAV;
    const totalCapitalInvested = rawDeposits.reduce((s, d) => s + d.amount, 0);
    // Weighted-average cost per unit across all subscriptions. Since deposits
    // buy in at different NAVs, this drifts from the $100 base — it's the true
    // cost reference for a money-weighted return.
    const avgCostPerUnit = totalUnits > 0 ? totalCapitalInvested / totalUnits : BASE_NAV;
    const currentCash =
      latestDates.length > 0 ? dailyCash[latestDates[latestDates.length - 1]] ?? 0 : 0;

    // XIRR — money-weighted annualized return: each deposit is cash paid in
    // (negative) on its date; the current total fund value is the positive
    // terminal flow today.
    const latestDate = latestDates[latestDates.length - 1] ?? rawDeposits[rawDeposits.length - 1]?.date;
    const xirrRate = xirr([
      ...rawDeposits.map((d) => ({ date: d.date, amount: -d.amount })),
      ...(latestValue > 0 && latestDate ? [{ date: latestDate, amount: latestValue }] : []),
    ]);
    const xirrPct = xirrRate != null ? +(xirrRate * 100).toFixed(2) : null;

    const summary: NAVSummary = {
      currentNAV,
      totalUnits,
      totalCapitalInvested,
      currentPortfolioValue: latestValue,
      currentCash,
      avgCostPerUnit,
      totalReturnPct: ((currentNAV - BASE_NAV) / BASE_NAV) * 100,
      xirr: xirrPct,
      deposits,
      monthly,
      daily,
      dividendYtd,
      risk: { volatility, sharpeRatio, maxDrawdown },
    };

    // A zero portfolio value means the equity summary couldn't be read this time —
    // don't overwrite a previously-good summary with the degraded one.
    if (summary.currentPortfolioValue === 0) {
      const cached = readCache<NAVSummary>(CACHE_KEY);
      if (cached && cached.currentPortfolioValue > 0) return NextResponse.json(cached);
    }

    writeCache(CACHE_KEY, summary);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[nav]", err);
    const cached = readCache<NAVSummary>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
    return NextResponse.json(null);
  }
}
