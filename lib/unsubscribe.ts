import crypto from "node:crypto";
import { db } from "@/lib/database";

// One-click unsubscribe for match-alert emails (DPDP consent withdrawal).
// The link carries only the pin id + an HMAC over (id, stored email) — no
// email address in the URL (URLs end up in logs), no schema change, and a
// signature only ever deletes the pin it was minted for.

const SECRET =
  process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_KEY || "dev-secret";

export function unsubscribeSig(pinId: number, email: string): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`unsub:${pinId}:${email.trim().toLowerCase()}`)
    .digest("hex");
}

export function verifyUnsubscribeSig(
  pinId: number,
  email: string,
  sig: string
): boolean {
  const a = Buffer.from(unsubscribeSig(pinId, email));
  const b = Buffer.from(String(sig || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function unsubscribeUrl(
  base: string,
  pinId: number,
  email: string
): string {
  return `${base}/api/unsubscribe?pin=${pinId}&sig=${unsubscribeSig(pinId, email)}`;
}

/** Delete a seeker pin + its notifications (explicit child delete — D1 does
 *  not reliably enforce ON DELETE CASCADE). Idempotent. */
export async function deleteSeekerPin(pinId: number): Promise<void> {
  const d = await db();
  await d.run("DELETE FROM notifications WHERE seeker_pin_id = ?", [pinId]);
  await d.run("DELETE FROM seeker_pins WHERE id = ?", [pinId]);
}
