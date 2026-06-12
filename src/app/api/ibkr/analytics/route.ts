import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";
import { readCache, writeCache } from "@/lib/cache";
import {
  getCandles,
  getCandlesSince,
  periodReturn,
  dailyReturns,
  computeBetaAlpha,
} from "@/lib/yahoo/client";

const GATEWAY = process.env.IBKR_GATEWAY_URL || "https://localhost:5010/v1/api";
const ACCOUNT_ID = process.env.IBKR_ACCOUNT_ID || "";

const ibkr = axios.create({
  baseURL: GATEWAY,
  timeout: 10000,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

async function fetchPAReturns(period: string) {
  const res = await ibkr.post("/pa/performance", {
    acctIds: [ACCOUNT_ID],
    freq: "D",
    period,
  });
  const dailyRets: number[] = res.data?.cps?.data?.[0]?.returns ?? [];
  const monthlyDates: string[] = res.data?.tpps?.dates ?? [];
  const monthlyRets: number[] = res.data?.tpps?.data?.[0]?.returns ?? [];
  return {
    lastCumulative: dailyRets[dailyRets.length - 1] ?? 0,
    dailyRets,
    monthlyDates,
    monthlyRets,
  };
}

function calcVolatilityAndDrawdown(cumulativeReturns: number[]) {
  if (cumulativeReturns.length < 2) return { volatility: 0, maxDrawdown: 0, sharpe: 0 };

  const daily: number[] = [];
  for (let i = 1; i < cumulativeReturns.length; i++) {
    daily.push(
      (cumulativeReturns[i] - cumulativeReturns[i - 1]) / (1 + cumulativeReturns[i - 1])
    );
  }

  const mean = daily.reduce((s, r) => s + r, 0) / daily.length;
  const variance = daily.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / daily.length;
  const std = Math.sqrt(variance);
  const volatility = +(std * Math.sqrt(252) * 100).toFixed(2);

  let peak = cumulativeReturns[0];
  let maxDrawdown = 0;
  for (const r of cumulativeReturns) {
    if (r > peak) peak = r;
    const dd = (r - peak) / (1 + peak);
    if (dd < maxDrawdown) maxDrawdown = dd;
  }

  const rf = 0.043 / 252;
  const sharpe = std > 0 ? +(((mean - rf) / std) * Math.sqrt(252)).toFixed(2) : 0;

  return { volatility, maxDrawdown: +(maxDrawdown * 100).toFixed(2), sharpe };
}

function extractSymbol(contractDesc: string): string {
  const m = contractDesc.match(/\(([A-Z]{1,5})\)/);
  if (m) return m[1];
  const w = contractDesc.split(/\s/)[0];
  return /^[A-Z]{1,5}$/.test(w) ? w : contractDesc.slice(0, 5).trim();
}

export async function GET() {
  const CACHE_KEY = "analytics";

  try {
    // Fetch IBKR PA returns and positions in parallel with Yahoo benchmark data
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const inceptionDate = new Date(2026, 1, 1); // Feb 1 2026

    const [ytdData, mtdData, oneMonthData, spyMtd, spy1m, spyYtd, spy1y, spySinceInception, posRes, navRes] = await Promise.all([
      fetchPAReturns("YTD"),
      fetchPAReturns("MTD"),
      fetchPAReturns("1M"),
      getCandlesSince("SPY", monthStart),     // MTD: from 1st of current month
      getCandles("SPY", "1mo"),               // 1M: last 30 calendar days
      getCandles("SPY", "ytd"),
      getCandles("SPY", "1y"),
      getCandlesSince("SPY", inceptionDate),  // Since Feb 1 (inception)
      ibkr.get(`/portfolio/${ACCOUNT_ID}/positions/0`),
      ibkr.get(`/portfolio/${ACCOUNT_ID}/summary`),
    ]);

    const positions: { contractDesc: string; mktValue: number; unrealizedPnl: number }[] =
      posRes.data ?? [];
    const symbols = positions.map((p) => extractSymbol(p.contractDesc));

    // Fetch 1Y candles for each position + SPY for beta calculation
    const spy1yReturns = dailyReturns(spy1y.closes);
    const positionCandles = await Promise.all(
      symbols.map((s) => getCandles(s, "1y").catch(() => ({ timestamps: [], closes: [] })))
    );

    // Per-position beta/alpha vs SPY
    const positionMetrics = positions.map((p, i) => {
      const sym = symbols[i];
      const assetReturns = dailyReturns(positionCandles[i].closes);
      const { beta, alpha } = computeBetaAlpha(assetReturns, spy1yReturns);
      const costBasis = p.mktValue - p.unrealizedPnl;
      const contribution = costBasis > 0 ? +((p.unrealizedPnl / costBasis) * 100).toFixed(2) : 0;
      const totalMktVal = positions.reduce((s, pos) => s + pos.mktValue, 0);
      const weight = totalMktVal > 0 ? +((p.mktValue / totalMktVal) * 100).toFixed(1) : 0;
      return { symbol: sym, beta, alpha, contribution, weight, unrealizedPnl: p.unrealizedPnl };
    });

    // Portfolio weighted beta & alpha
    const totalMktValue = positions.reduce((s, p) => s + p.mktValue, 0);
    const portfolioBeta = positionMetrics.reduce(
      (s, m) => s + m.beta * (m.weight / 100),
      0
    );
    const portfolioAlpha = positionMetrics.reduce(
      (s, m) => s + m.alpha * (m.weight / 100),
      0
    );

    // Risk from IBKR PA daily cumulative returns
    const risk = calcVolatilityAndDrawdown(oneMonthData.dailyRets);

    // Benchmark returns (SPY)
    const benchmarkReturns = {
      mtd: +(periodReturn(spyMtd.closes) * 100).toFixed(2),
      oneMonth: +(periodReturn(spy1m.closes) * 100).toFixed(2),
      ytd: +(periodReturn(spyYtd.closes) * 100).toFixed(2),
      sinceInception: +(periodReturn(spySinceInception.closes) * 100).toFixed(2),
      oneYear: +(periodReturn(spy1y.closes) * 100).toFixed(2),
    };

    // Total return vs initial deposit from env
    const totalDeposited = Number(process.env.TOTAL_DEPOSITED ?? 0);
    const currentNAV: number = navRes.data?.netliquidation?.amount ?? 0;
    const totalReturnVsDeposit = totalDeposited > 0
      ? +(((currentNAV - totalDeposited) / totalDeposited) * 100).toFixed(2)
      : 0;
    const totalReturnDollar = +(currentNAV - totalDeposited).toFixed(2);

    const result = {
      returns: {
        mtd: +(mtdData.lastCumulative * 100).toFixed(2),
        ytd: +(ytdData.lastCumulative * 100).toFixed(2),
        oneMonth: +(oneMonthData.lastCumulative * 100).toFixed(2),
        monthly: ytdData.monthlyDates.map((d, i) => ({
          month: `${d.slice(0, 4)}-${d.slice(4, 6)}`,
          return: +(ytdData.monthlyRets[i] * 100).toFixed(2),
        })),
        totalReturn: totalReturnVsDeposit,
        totalReturnDollar,
      },
      benchmark: benchmarkReturns,
      risk: {
        ...risk,
        beta: +portfolioBeta.toFixed(3),
        alpha: +portfolioAlpha.toFixed(2),
      },
      attribution: positionMetrics.sort((a, b) => b.unrealizedPnl - a.unrealizedPnl),
      totalPortfolioValue: totalMktValue,
    };

    writeCache(CACHE_KEY, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[analytics]", err);
    const cached = readCache(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ error: "Gateway offline" }, { status: 503 });
  }
}
