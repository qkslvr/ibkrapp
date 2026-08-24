import { NextRequest, NextResponse } from "next/server";
import { isAllowed, hasPassword, setPassword } from "@/lib/auth/users";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

// First-time password creation for an authorized email.
export async function POST(request: NextRequest) {
  const { email, password } = await request.json().catch(() => ({}));

  if (!email || !isAllowed(email)) {
    return NextResponse.json({ error: "This email is not authorized." }, { status: 403 });
  }
  if (hasPassword(email)) {
    return NextResponse.json({ error: "An account already exists. Please sign in." }, { status: 409 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  await setPassword(email, password);

  const secret = process.env.SESSION_SECRET || "";
  const token = await signSession(email, secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}
