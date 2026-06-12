import { NextResponse } from "next/server";
import { ibkrClient } from "@/lib/ibkr/client";
import { cacheExists } from "@/lib/cache";

export async function GET() {
  const connected = await ibkrClient.checkAuth();
  const hasCachedData = cacheExists("positions") && cacheExists("account");
  return NextResponse.json({ connected, hasCachedData });
}
