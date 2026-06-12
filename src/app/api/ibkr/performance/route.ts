import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";
import { readCache, writeCache } from "@/lib/cache";
import { mockPerformanceData } from "@/lib/mock-data";
import { PerformanceDataPoint } from "@/types";

const CACHE_KEY = "performance";
const GATEWAY = process.env.IBKR_GATEWAY_URL || "https://localhost:5010/v1/api";
const ACCOUNT_ID = process.env.IBKR_ACCOUNT_ID || "";

const client = axios.create({
  baseURL: GATEWAY,
  timeout: 8000,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

const PERIOD_MAP: Record<string, string> = {
  "1D": "1D",
  "1W": "1W",
  "1M": "1M",
  "3M": "3M",
  "6M": "6M",
  YTD: "YTD",
  "1Y": "1Y",
  ALL: "3Y",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "1M";
  const ibkrPeriod = PERIOD_MAP[period] ?? "1M";
  const cacheKey = `${CACHE_KEY}_${period}`;

  try {
    const [navRes, paRes] = await Promise.all([
      client.get(`/portfolio/${ACCOUNT_ID}/summary`),
      client.post(`/pa/performance`, {
        acctIds: [ACCOUNT_ID],
        freq: "D",
        period: ibkrPeriod,
      }),
    ]);

    const currentNAV: number = navRes.data?.netliquidation?.amount ?? 0;
    if (!currentNAV) throw new Error("No NAV data");

    const dates: string[] = paRes.data?.cps?.dates ?? [];
    const returns: number[] = paRes.data?.cps?.data?.[0]?.returns ?? [];

    if (!dates.length || !returns.length) throw new Error("No PA data");

    // Reconstruct absolute NAV: currentNAV = startNAV * (1 + lastCumulativeReturn)
    const lastReturn = returns[returns.length - 1];
    const startNAV = currentNAV / (1 + lastReturn);

    const points: PerformanceDataPoint[] = dates.map((d, i) => ({
      date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      value: Math.round(startNAV * (1 + returns[i])),
    }));

    writeCache(cacheKey, points);
    return NextResponse.json({ data: points, startValue: Math.round(startNAV) });
  } catch {
    const cached = readCache<PerformanceDataPoint[]>(cacheKey);
    if (cached?.length) {
      return NextResponse.json({ data: cached, startValue: cached[0].value });
    }
    return NextResponse.json({
      data: mockPerformanceData,
      startValue: mockPerformanceData[0]?.value ?? 0,
    });
  }
}
