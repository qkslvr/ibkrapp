// Signed session token — HMAC-SHA256 over the payload with SESSION_SECRET.
// Uses Web Crypto so it runs in BOTH the Edge middleware and Node route
// handlers. Stateless: the cookie itself proves who the user is, so middleware
// can verify without reading any server-side store.

const enc = new TextEncoder();
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str: string): Uint8Array {
  const b = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(email: string, secret: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ e: email.toLowerCase(), t: Date.now() })));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, enc.encode(payload) as BufferSource),
  );
  return `${payload}.${b64url(sig)}`;
}

/** Returns the email if the token is valid and unexpired, else null. */
export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<string | null> {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      fromB64url(sig) as BufferSource,
      enc.encode(payload) as BufferSource,
    );
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { e: string; t: number };
    if (!data.e || typeof data.t !== "number" || Date.now() - data.t > MAX_AGE_MS) return null;
    return data.e;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = MAX_AGE_MS / 1000;
