import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";
import { readCache, writeCache } from "@/lib/cache";
import { getCandles } from "@/lib/yahoo/client";

const GATEWAY = process.env.IBKR_GATEWAY_URL || "https://localhost:5010/v1/api";
const ACCOUNT_ID = process.env.IBKR_ACCOUNT_ID || "";

const ibkr = axios.create({
  baseURL: GATEWAY,
  timeout: 8000,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

const yahoo = axios.create({
  baseURL: "https://query1.finance.yahoo.com",
  timeout: 8000,
  headers: { "User-Agent": "Mozilla/5.0" },
});

function extractSymbol(contractDesc: string): string {
  const m = contractDesc.match(/\(([A-Z]{1,5})\)/);
  if (m) return m[1];
  const w = contractDesc.split(/\s/)[0];
  return /^[A-Z]{1,5}$/.test(w) ? w : contractDesc.slice(0, 5).trim();
}

async function getDividendData(symbol: string, shares: number) {
  try {
    const res = await yahoo.get(`/v8/finance/chart/${symbol}`, {
      params: { interval: "1d", range: "1y", events: "dividends" },
    });
    const result = res.data?.chart?.result?.[0];
    const price: number = result?.meta?.regularMarketPrice ?? 0;
    const name: string = result?.meta?.longName ?? result?.meta?.shortName ?? symbol;
    const rawDivs = result?.events?.dividends ?? {};

    const divList: { date: number; amount: number }[] = Object.values(rawDivs);
    divList.sort((a, b) => a.date - b.date);

    if (!divList.length) return null;

    const recent4 = divList.slice(-4);
    const annualRate = recent4.reduce((s, d) => s + d.amount, 0);
    const divYield = price > 0 ? (annualRate / price) * 100 : 0;
    const annualIncome = annualRate * shares;

    const lastDiv = divList[divList.length - 1];
    const lastDate = new Date(lastDiv.date * 1000).toISOString().split("T")[0];

    // Estimate next ex-date: ~91 days (quarterly) after last
    const nextTimestamp = lastDiv.date + 91 * 86400;
    const nextDate = new Date(nextTimestamp * 1000).toISOString().split("T")[0];
    const nextAmount = lastDiv.amount * shares;

    // Monthly income received this year from dividend events
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000;
    const ytdIncome = divList
      .filter((d) => d.date >= yearStart)
      .reduce((s, d) => s + d.amount * shares, 0);

    return {
      symbol,
      name,
      shares,
      yield: +divYield.toFixed(2),
      annualRate: +annualRate.toFixed(4),
      annualIncome: +annualIncome.toFixed(2),
      lastExDate: lastDate,
      estimatedNextExDate: nextDate,
      estimatedNextAmount: +nextAmount.toFixed(2),
      ytdIncome: +ytdIncome.toFixed(2),
      history: divList.map((d) => ({
        date: new Date(d.date * 1000).toISOString().split("T")[0],
        amount: +d.amount.toFixed(4),
        income: +(d.amount * shares).toFixed(2),
      })),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const CACHE_KEY = "income";

  try {
    const [posRes, ledgerRes] = await Promise.all([
      ibkr.get(`/portfolio/${ACCOUNT_ID}/positions/0`),
      ibkr.get(`/portfolio/${ACCOUNT_ID}/ledger`),
    ]);

    const positions: { contractDesc: string; mktValue: number; position: number }[] =
      posRes.data ?? [];

    // ytdDividends from IBKR ledger (most accurate)
    const ibkrYtdDividends: number = ledgerRes.data?.USD?.dividends ?? 0;

    const dividendData = await Promise.all(
      positions.map((p) => {
        const symbol = extractSymbol(p.contractDesc);
        const shares = Math.abs(p.position);
        return getDividendData(symbol, shares);
      })
    );

    const holdings = dividendData.filter(Boolean) as NonNullable<
      Awaited<ReturnType<typeof getDividendData>>
    >[];

    const totalAnnualIncome = holdings.reduce((s, h) => s + h.annualIncome, 0);
    const avgYield =
      holdings.length > 0
        ? holdings.reduce((s, h) => s + h.yield, 0) / holdings.length
        : 0;
    const ytdIncome = ibkrYtdDividends || holdings.reduce((s, h) => s + h.ytdIncome, 0);

    // Monthly income breakdown for the current year
    const monthlyMap: Record<number, number> = {};
    for (const h of holdings) {
      const yearStart = new Date().getFullYear();
      for (const hd of h.history) {
        if (hd.date.startsWith(String(yearStart))) {
          const month = new Date(hd.date).getMonth();
          monthlyMap[month] = (monthlyMap[month] ?? 0) + hd.income;
        }
      }
    }
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2026, i, 1).toLocaleString("en-US", { month: "short" }),
      income: +(monthlyMap[i] ?? 0).toFixed(2),
    }));

    const result = {
      holdings,
      summary: {
        ytdIncome: +ytdIncome.toFixed(2),
        totalAnnualIncome: +totalAnnualIncome.toFixed(2),
        avgYield: +avgYield.toFixed(2),
        monthlyAvg: +(totalAnnualIncome / 12).toFixed(2),
      },
      monthly,
    };

    writeCache(CACHE_KEY, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[income]", err);
    const cached = readCache(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
    return NextResponse.json({ error: "Gateway offline" }, { status: 503 });
  }
}
