// Minimal Telegram Bot API client. Needs TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
// (chat id may be a group/channel id like -100123…). Returns false when not
// configured so callers can degrade quietly.
export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegram(html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping send");
    return false;
  }
  // Telegram caps a message at 4096 chars; split on blank lines if needed.
  const chunks: string[] = [];
  let cur = "";
  for (const para of html.split("\n\n")) {
    if ((cur + "\n\n" + para).length > 3900 && cur) {
      chunks.push(cur);
      cur = para;
    } else cur = cur ? cur + "\n\n" + para : para;
  }
  if (cur) chunks.push(cur);

  for (const text of chunks) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    if (!res.ok) {
      console.error("[telegram] send failed", res.status, (await res.text()).slice(0, 300));
      return false;
    }
  }
  return true;
}
