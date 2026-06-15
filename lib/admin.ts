import { cookies } from "next/headers";

// For local/MVP use only. In production, replace with real auth (see PLAN.md).
export const ADMIN_KEY = process.env.ADMIN_KEY || "letmein";
const COOKIE = "admin_key";

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value === ADMIN_KEY;
}

export const ADMIN_COOKIE = COOKIE;
