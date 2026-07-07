import { cookies } from "next/headers";
import crypto from "node:crypto";

export const ADMIN_KEY = process.env.ADMIN_KEY || "letmein";
const COOKIE = "admin_session";
const IS_PROD = process.env.NODE_ENV === "production";
const USING_DEFAULT_KEY = ADMIN_KEY === "letmein";

// Minimum acceptable key strength in production. `openssl rand -hex 32` → 64
// chars; we require at least 24 to block lazy/guessable keys.
const MIN_KEY_LEN = 24;
const KEY_TOO_WEAK = ADMIN_KEY.length < MIN_KEY_LEN;

// Session token = HMAC(secret, "v<version>"), NOT a plain hash of the key:
//  - prefer a dedicated ADMIN_SESSION_SECRET (Worker secret). When set, a
//    leaked cookie reveals nothing about ADMIN_KEY, and rotating this secret
//    revokes every existing session without changing the key admins type.
//  - bumping ADMIN_TOKEN_VERSION also invalidates all outstanding cookies.
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || ADMIN_KEY;
const ADMIN_TOKEN_VERSION = "1";

// True when admin login must be refused outright (prod misconfiguration).
export const ADMIN_DISABLED = IS_PROD && (USING_DEFAULT_KEY || KEY_TOO_WEAK);

if (ADMIN_DISABLED) {
  console.error(
    USING_DEFAULT_KEY
      ? "[admin] ADMIN_KEY is the insecure default in production — admin login is disabled until a strong ADMIN_KEY is set."
      : `[admin] ADMIN_KEY is too short (<${MIN_KEY_LEN} chars) in production — admin login is disabled. Use: openssl rand -hex 32`
  );
}

// Revocable, non-reversible session token bound to the server secret + version.
export function adminToken(): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`v${ADMIN_TOKEN_VERSION}`)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// Constant-time key check; refuses default/weak keys in production.
export function checkAdminKey(key: string): boolean {
  if (ADMIN_DISABLED) return false;
  return safeEqual(key, ADMIN_KEY);
}

export async function isAdmin(): Promise<boolean> {
  if (ADMIN_DISABLED) return false;
  const jar = await cookies();
  const val = jar.get(COOKIE)?.value;
  return !!val && safeEqual(val, adminToken());
}

export const ADMIN_COOKIE = COOKIE;
