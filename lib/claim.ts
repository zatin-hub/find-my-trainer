import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";

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
  const row = getDb()
    .prepare("SELECT claim_token FROM trainers WHERE id = ?")
    .get(trainerId) as { claim_token: string | null } | undefined;
  if (!row?.claim_token) return false;
  const jar = await cookies();
  return jar.get(claimCookieName(trainerId))?.value === row.claim_token;
}
