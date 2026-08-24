// Access list + per-person passwords for Theseus Capital.
// Only whitelisted emails may hold an account; each sets their own password on
// first sign-in. There is one fund — everyone authorized sees the same
// dashboard — so this is an access list, not multi-tenant accounts.
//
// Node-only (fs + bcrypt): used from route handlers, never from middleware.
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const WHITELIST = (
  process.env.WHITELISTED_EMAILS ||
  "sanal@kirastudio.xyz,abhishek@kirastudio.xyz,abin@getloopin.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const FILE = path.join(process.cwd(), ".cache", "users.json");

interface UserRecord {
  passwordHash: string;
  createdAt: string;
}
type Store = Record<string, UserRecord>;

function readStore(): Store {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2), "utf-8");
}

const norm = (email: string) => email.trim().toLowerCase();

export function isAllowed(email: string): boolean {
  return WHITELIST.includes(norm(email));
}

export function hasPassword(email: string): boolean {
  return Boolean(readStore()[norm(email)]);
}

export async function setPassword(email: string, password: string): Promise<void> {
  const store = readStore();
  store[norm(email)] = {
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  };
  writeStore(store);
}

export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const rec = readStore()[norm(email)];
  if (!rec) return false;
  return bcrypt.compare(password, rec.passwordHash);
}
