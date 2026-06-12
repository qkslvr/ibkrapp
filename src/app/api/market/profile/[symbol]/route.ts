import { NextResponse } from "next/server";
import { getCompanyProfile } from "@/lib/finnhub/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const profile = await getCompanyProfile(symbol.toUpperCase());
  return NextResponse.json(profile);
}
