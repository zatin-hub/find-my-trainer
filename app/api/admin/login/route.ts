import { NextRequest, NextResponse } from "next/server";
import { ADMIN_KEY, ADMIN_COOKIE } from "@/lib/admin";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const rl = rateLimit(`adminlogin:${clientIp(req)}`, 5, 60_000);
  if (!rl.ok)
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (String(body.key || "") !== ADMIN_KEY)
    return NextResponse.json({ error: "Wrong key" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, ADMIN_KEY, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return res;
}
