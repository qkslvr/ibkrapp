import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".cache");

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export function readCache<T>(key: string): T | null {
  try {
    const file = path.join(CACHE_DIR, `${key}.json`);
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  try {
    ensureCacheDir();
    const file = path.join(CACHE_DIR, `${key}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`[cache] Failed to write cache for "${key}":`, err);
  }
}

export function cacheExists(key: string): boolean {
  return fs.existsSync(path.join(CACHE_DIR, `${key}.json`));
}
