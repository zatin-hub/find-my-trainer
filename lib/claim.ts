import { cookies } from "next/headers";
import crypto from "node:crypto";
import { db } from "@/lib/database";

// Claim flow is opt-in. It stays off until the ownership-verification model
// (audit finding H1) is decided; enable with ENABLE_CLAIMS=true.
export function claimsEnabled(): boolean {
  return process.env.ENABLE_CLAIMS === "true";
}

export function claimCookieName(trainerId: number): string {
  return `claim_${trainerId}`;
}

export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function newClaimToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

/** Is the current request the verified owner of this trainer? */
export async function isOwner(trainerId: number): Promise<boolean> {
  const row = await (await db()).get<{ claim_token: string | null }>(
    "SELECT claim_token FROM trainers WHERE id = ?",
    [trainerId]
  );
  if (!row?.claim_token) return false;
  const jar = await cookies();
  return jar.get(claimCookieName(trainerId))?.value === row.claim_token;
}
