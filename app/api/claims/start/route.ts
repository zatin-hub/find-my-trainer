import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashOtp } from "@/lib/claim";
import { clientIp, rateLimit } from "@/lib/ratelimit";

// No email/SMS provider is wired locally, so the OTP is returned in the
// response (dev only). In production, send it via Resend/SMS and never return it.
const EXPOSE_OTP = process.env.EXPOSE_DEV_OTP !== "false";

export async function POST(req: NextRequest) {
  const rl = rateLimit(`claimstart:${clientIp(req)}`, 5, 60_000);
  if (!rl.ok)
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const trainerSlug = String(body.trainer || "").trim();
  const method = String(body.contact_method || "");
  const value = String(body.contact_value || "").trim();
  if (!["email", "phone"].includes(method) || value.length < 5)
    return NextResponse.json({ error: "Enter a valid contact" }, { status: 400 });

  const db = getDb();
  const trainer = db
    .prepare("SELECT id FROM trainers WHERE slug = ?")
    .get(trainerSlug) as { id: number } | undefined;
  if (!trainer)
    return NextResponse.json({ error: "Unknown trainer" }, { status: 404 });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO claims (trainer_id, contact_method, contact_value, otp_hash, expires_at)
     VALUES (?,?,?,?,?)`
  ).run(trainer.id, method, value, hashOtp(otp), expires);

  console.log(`[claim] OTP for trainer ${trainerSlug} -> ${otp}`);
  return NextResponse.json({ ok: true, ...(EXPOSE_OTP ? { devOtp: otp } : {}) });
}
