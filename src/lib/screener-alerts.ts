// Nightly Telegram digest: only the names that entered a screen since the last
// index build. Runs at the end of each build; the cron route can also trigger it
// (idempotent per calendar day so a safety-net cron never double-sends).
import { SCREENS } from "@/lib/screens";
import { recordMembership, readMembership, type NewEntrant } from "@/lib/screener-membership";
import { sendTelegram, telegramConfigured } from "@/lib/telegram";
import { formatMarketCap, isDomestic } from "@/lib/utils";
import type { ScreenerIndex } from "@/lib/screener-index-job";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (v: number | null) => (v == null ? "—" : `$${v.toFixed(2)}`);

export function buildAlertMessage(entrants: NewEntrant[], date = new Date()): string {
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const byScreen = new Map<string, NewEntrant[]>();
  for (const e of entrants) (byScreen.get(e.screenId) ?? byScreen.set(e.screenId, []).get(e.screenId)!).push(e);

  const sections: string[] = [];
  for (const screen of SCREENS) {
    const list = byScreen.get(screen.id);
    if (!list?.length) continue;
    list.sort((a, b) => (b.stock.marketCap ?? 0) - (a.stock.marketCap ?? 0));
    const lines = list.map((e) => {
      const s = e.stock;
      const flag = s.country && !isDomestic(s.country) ? ` · ${esc(s.country)}` : "";
      return `• <b>${esc(s.symbol)}</b> ${esc(s.company)} — ${formatMarketCap(s.marketCap ?? 0)} · ${money(s.price)}${flag}`;
    });
    sections.push(`<b>${esc(screen.name)}</b> <i>(${esc(screen.tagline)})</i>\n${lines.join("\n")}`);
  }
  const uniq = new Set(entrants.map((e) => e.symbol)).size;
  return [
    `📡 <b>Screener — new entrants · ${day}</b>`,
    `${uniq} new name${uniq === 1 ? "" : "s"} across ${byScreen.size} screen${byScreen.size === 1 ? "" : "s"}`,
    ...sections,
    `<a href="https://throughputx.org/screener">Open the combined screener</a>`,
  ].join("\n\n");
}

export interface AlertResult {
  status: "sent" | "nothing-new" | "first-run" | "already-ran-today" | "not-configured" | "no-index";
  newEntrants: number;
  message?: string;
}

export async function runScreenerAlert(index: ScreenerIndex | null, opts: { dry?: boolean; force?: boolean } = {}): Promise<AlertResult> {
  if (!index || index.status !== "ready") return { status: "no-index", newEntrants: 0 };

  const prev = readMembership();
  const today = new Date().toISOString().slice(0, 10);
  if (!opts.force && prev && new Date(prev.updatedAt).toISOString().slice(0, 10) === today) {
    return { status: "already-ran-today", newEntrants: 0 };
  }

  const { firstRun, newEntrants } = recordMembership(index, !opts.dry);
  if (firstRun) return { status: "first-run", newEntrants: 0 };
  if (!newEntrants.length) return { status: "nothing-new", newEntrants: 0 };

  const message = buildAlertMessage(newEntrants);
  if (opts.dry) return { status: "sent", newEntrants: newEntrants.length, message };
  if (!telegramConfigured()) return { status: "not-configured", newEntrants: newEntrants.length, message };
  const ok = await sendTelegram(message);
  return { status: ok ? "sent" : "not-configured", newEntrants: newEntrants.length, message };
}
