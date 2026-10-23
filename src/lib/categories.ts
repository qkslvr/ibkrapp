import fs from "fs";
import path from "path";

// User-defined holding categories. Persisted as a plain JSON file outside the
// cache dir so clearing caches never loses them.
export interface CategoryStore {
  categories: string[];
  bySymbol: Record<string, string>;
}

const FILE = path.join(process.cwd(), "data", "categories.json");

export function readCategories(): CategoryStore {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, "utf-8")) as Partial<CategoryStore>;
    return { categories: raw.categories ?? [], bySymbol: raw.bySymbol ?? {} };
  } catch {
    return { categories: [], bySymbol: {} };
  }
}

export function writeCategories(store: CategoryStore): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2), "utf-8");
}
