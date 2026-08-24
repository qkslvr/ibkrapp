import { NextRequest, NextResponse } from "next/server";
import { isAllowed, hasPassword } from "@/lib/auth/users";

// Given an email, tell the login UI which step to show: not authorized, set a
// password (first time), or enter password.
export async function POST(request: NextRequest) {
  const { email } = await request.json().catch(() => ({}));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }
  const allowed = isAllowed(email);
  return NextResponse.json({
    allowed,
    hasPassword: allowed ? hasPassword(email) : false,
  });
}
