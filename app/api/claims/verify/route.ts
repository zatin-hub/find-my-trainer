import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { claimCookieName, hashOtp, newClaimToken } from "@/lib/claim";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const rl = rateLimit(`claimverify:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok)
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const trainerSlug = String(body.trainer || "").trim();
  const otp = String(body.otp || "").trim();

  const db = getDb();
  const trainer = db
    .prepare("SELECT id FROM trainers WHERE slug = ?")
    .get(trainerSlug) as { id: number } | undefined;
  if (!trainer)
    return NextResponse.json({ error: "Unknown trainer" }, { status: 404 });

  const claim = db
    .prepare(
      `SELECT id FROM claims
       WHERE trainer_id = ? AND otp_hash = ? AND status = 'pending'
         AND expires_at > datetime('now')
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(trainer.id, hashOtp(otp)) as { id: number } | undefined;
  if (!claim)
    return NextResponse.json(
      { error: "Invalid or expired code" },
      { status: 400 }
    );

  const token = newClaimToken();
  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE claims SET status = 'verified', verified_at = datetime('now') WHERE id = ?"
    ).run(claim.id);
    db.prepare(
      "UPDATE trainers SET claimed = 1, verified = 1, claim_token = ? WHERE id = ?"
    ).run(token, trainer.id);
  });
  tx();

  const res = NextResponse.json({ ok: true });
  res.cookies.set(claimCookieName(trainer.id), token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  return res;
}
