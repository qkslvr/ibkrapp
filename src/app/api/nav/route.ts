import { NextResponse } from "next/server";
import { readCache, writeCache } from "@/lib/cache";
import { NAVSummary, NAVDeposit, NAVMonthlySnapshot } from "@/types";
import {
  fetchFlexStatement,
  parseCashTransactions,
  parseEquitySummary,
} from "@/lib/ibkr/flex";

const FLEX_ACTIVITY_QUERY_ID = process.env.IBKR_FLEX_ACTIVITY_QUERY_ID || "";
const FLEX_NAV_QUERY_ID = process.env.IBKR_FLEX_NAV_QUERY_ID || "";
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
    for (const row of equityRows) {
      const date = parseDateStr(row.reportDate);
      if (date) dailyValue[date] = row.total;
    }

    // Get deposit events from activity query, sorted ascending by date
    const cashTxns = parseCashTransactions(activityXml ?? equityXml ?? "");
    const rawDeposits = cashTxns
      .filter((t) => t.type === "Deposits/Withdrawals" && t.amount > 0)
      .map((t) => ({ date: parseDateStr(t.dateTime), amount: t.amount }))
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

    // Calculate units issued per deposit at the NAV on that date
    let totalUnits = 0;
    const deposits: NAVDeposit[] = [];

    for (const dep of rawDeposits) {
      let navAtDeposit: number;
      if (totalUnits === 0) {
        // First deposit — set base NAV
        navAtDeposit = BASE_NAV;
      } else {
        const portfolioValue = portfolioValueBefore(dep.date);
        navAtDeposit = portfolioValue > 0 ? portfolioValue / totalUnits : BASE_NAV;
      }
      const unitsIssued = dep.amount / navAtDeposit;
      totalUnits += unitsIssued;
      deposits.push({ date: dep.date, amount: dep.amount, navAtDeposit, unitsIssued });
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

    // Current state
    const latestDates = Object.keys(dailyValue).sort();
    const latestValue =
      latestDates.length > 0 ? dailyValue[latestDates[latestDates.length - 1]] : 0;
    const currentNAV = totalUnits > 0 ? latestValue / totalUnits : BASE_NAV;
    const totalCapitalInvested = rawDeposits.reduce((s, d) => s + d.amount, 0);

    const summary: NAVSummary = {
      currentNAV,
      totalUnits,
      totalCapitalInvested,
      currentPortfolioValue: latestValue,
      totalReturnPct: ((currentNAV - BASE_NAV) / BASE_NAV) * 100,
      deposits,
      monthly,
    };

    writeCache(CACHE_KEY, summary);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[nav]", err);
    const cached = readCache<NAVSummary>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
    return NextResponse.json(null);
  }
}
