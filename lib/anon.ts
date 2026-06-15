import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import crypto from "node:crypto";

const COOKIE = "anon_id";
const MAX_AGE = 60 * 60 * 24 * 365;

/** Read the anonymous contributor id from cookies, or mint a new one. */
export async function getAnonId(): Promise<string> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? crypto.randomUUID();
}

/** Persist the anon id on an outgoing response. */
export function setAnonCookie(res: NextResponse, anonId: string): NextResponse {
  res.cookies.set(COOKIE, anonId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return res;
}
