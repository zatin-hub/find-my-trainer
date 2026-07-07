import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { claimCookieName, hashOtp, newClaimToken, claimsEnabled } from "@/lib/claim";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  if (!claimsEnabled())
    return NextResponse.json({ error: "Claiming is not available" }, { status: 404 });

  const rl = await rateLimit(`claimverify:${clientIp(req)}`, 10, 60_000);
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

  const d = await db();
  const trainer = await d.get<{ id: number }>(
    "SELECT id FROM trainers WHERE slug = ?",
    [trainerSlug]
  );
  if (!trainer)
    return NextResponse.json({ error: "Unknown trainer" }, { status: 404 });

  const claim = await d.get<{ id: number }>(
    `SELECT id FROM claims
     WHERE trainer_id = ? AND otp_hash = ? AND status = 'pending'
       AND expires_at > datetime('now')
     ORDER BY created_at DESC LIMIT 1`,
    [trainer.id, hashOtp(otp)]
  );
  if (!claim)
    return NextResponse.json(
      { error: "Invalid or expired code" },
      { status: 400 }
    );

  const token = newClaimToken();
  await d.run(
    "UPDATE claims SET status = 'verified', verified_at = datetime('now') WHERE id = ?",
    [claim.id]
  );
  await d.run(
    "UPDATE trainers SET claimed = 1, verified = 1, claim_token = ? WHERE id = ?",
    [token, trainer.id]
  );

  const res = NextResponse.json({ ok: true });
  res.cookies.set(claimCookieName(trainer.id), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  return res;
}
