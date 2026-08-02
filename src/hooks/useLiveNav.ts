"use client";

import { useNAV } from "./useNAV";
import { usePositions } from "./usePositions";
import { usePortfolioSummary } from "./usePortfolioSummary";
import { NAVDailyPoint, NAVSummary } from "@/types";

const BASE_NAV = 100;

export interface LiveNav {
  nav: NAVSummary | null;
  isLoading: boolean;
  /** True when we're showing an intraday estimate (Flex hasn't booked today yet). */
  isLive: boolean;
  liveNav: number;
  liveValue: number;
  liveSecurities: number;
  liveCash: number;
  totalUnits: number;
  /** Return vs $100 base for the live NAV. */
  returnPct: number;
  /** Return vs weighted-average cost (money-weighted). */
  returnVsAvgPct: number;
  /** Intraday change of NAV/unit vs the last official close. */
  todayChangePct: number;
  todayChangeValue: number;
  /** Daily series with a synthetic live "today" point appended when applicable. */
  daily: NAVDailyPoint[];
}

// Live NAV = (Finviz-priced holdings + cash) ÷ units outstanding, so the number
// moves with the market intraday. Once the Flex EOD statement records today's
// official balance, that value wins (we stop appending a live point).
export function useLiveNav(): LiveNav {
  const { data: nav, isLoading: navLoading } = useNAV();
  const { data: positions, isLoading: posLoading } = usePositions();
  const { data: summary } = usePortfolioSummary();

  if (!nav) {
    return {
      nav: null,
      isLoading: navLoading,
      isLive: false,
      liveNav: BASE_NAV,
      liveValue: 0,
      liveSecurities: 0,
      liveCash: 0,
      totalUnits: 0,
      returnPct: 0,
      returnVsAvgPct: 0,
      todayChangePct: 0,
      todayChangeValue: 0,
      daily: [],
    };
  }

  // Cash must come from the SAME live snapshot as the holdings, or buying stock
  // (cash down, securities up) double-counts the spent cash. The IBKR gateway's
  // account summary reflects trades immediately and refreshes on the same 60s
  // cadence as positions; the Flex figure is end-of-day and lags. Prefer the
  // gateway cash, fall back to Flex only when the gateway has never reported.
  const liveCash =
    summary && Number.isFinite(summary.cashBalance) ? summary.cashBalance : nav.currentCash;
  const liveSecurities =
    positions && positions.length > 0
      ? positions.reduce((s, p) => s + Math.abs(p.marketValue), 0)
      : 0;

  const lastDate = nav.daily[nav.daily.length - 1]?.date;
  const lastNav = nav.daily[nav.daily.length - 1]?.nav ?? nav.currentNAV;
  const today = new Date().toISOString().slice(0, 10);

  // Only estimate live when we actually have priced holdings AND the official
  // series hasn't caught up to today yet.
  const canEstimate = liveSecurities > 0 && nav.totalUnits > 0;
  const isLive = canEstimate && (!lastDate || today > lastDate);

  const liveValue = isLive ? liveSecurities + liveCash : nav.currentPortfolioValue;
  const liveNav = isLive ? liveValue / nav.totalUnits : nav.currentNAV;

  const returnPct = ((liveNav - BASE_NAV) / BASE_NAV) * 100;
  const returnVsAvgPct =
    nav.avgCostPerUnit > 0 ? ((liveNav - nav.avgCostPerUnit) / nav.avgCostPerUnit) * 100 : 0;
  const todayChangePct = lastNav > 0 ? ((liveNav - lastNav) / lastNav) * 100 : 0;
  const todayChangeValue = (todayChangePct / 100) * liveValue;

  let daily = nav.daily;
  if (isLive) {
    const livePoint: NAVDailyPoint = {
      date: today,
      portfolioValue: liveValue,
      totalUnits: nav.totalUnits,
      nav: liveNav,
      returnPct,
      navChangePct: todayChangePct,
    };
    daily = [...nav.daily, livePoint];
  }

  return {
    nav,
    isLoading: navLoading || posLoading,
    isLive,
    liveNav,
    liveValue,
    liveSecurities,
    liveCash,
    totalUnits: nav.totalUnits,
    returnPct,
    returnVsAvgPct,
    todayChangePct,
    todayChangeValue,
    daily,
  };
}
