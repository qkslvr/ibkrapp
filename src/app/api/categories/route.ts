import { NextResponse } from "next/server";
import { readCategories, writeCategories } from "@/lib/categories";

export async function GET() {
  return NextResponse.json(readCategories());
}

// PUT { symbol, category } assigns (empty category clears). Unknown categories
// are created on the fly. PUT { category } alone just creates it.
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { symbol?: string; category?: string };
  const category = (body.category ?? "").trim().slice(0, 40);
  const symbol = (body.symbol ?? "").trim().toUpperCase();
  const store = readCategories();

  if (category && !store.categories.includes(category)) {
    store.categories = [...store.categories, category].sort((a, b) => a.localeCompare(b));
  }
  if (symbol) {
    if (category) store.bySymbol[symbol] = category;
    else delete store.bySymbol[symbol];
  }
  writeCategories(store);
  return NextResponse.json(store);
}
