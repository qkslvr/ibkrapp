import { NextResponse } from "next/server";
import { searchTickers } from "@/lib/finviz/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ results: [] });

  const results = await searchTickers(q, 15);
  return NextResponse.json({ results });
}
