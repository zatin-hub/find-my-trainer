import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { hashOtp, claimsEnabled } from "@/lib/claim";
import { clientIp, rateLimit } from "@/lib/ratelimit";

// Never expose the OTP in production; in dev it's returned so the flow is
// testable without an email/SMS provider (disable with EXPOSE_DEV_OTP=false).
const EXPOSE_OTP =
  process.env.NODE_ENV !== "production" &&
  process.env.EXPOSE_DEV_OTP !== "false";

export async function POST(req: NextRequest) {
  if (!claimsEnabled())
    return NextResponse.json({ error: "Claiming is not available" }, { status: 404 });

  const rl = await rateLimit(`claimstart:${clientIp(req)}`, 5, 60_000);
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

  const d = await db();
  const trainer = await d.get<{ id: number }>(
    "SELECT id FROM trainers WHERE slug = ?",
    [trainerSlug]
  );
  if (!trainer)
    return NextResponse.json({ error: "Unknown trainer" }, { status: 404 });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await d.run(
    `INSERT INTO claims (trainer_id, contact_method, contact_value, otp_hash, expires_at)
     VALUES (?,?,?,?,?)`,
    [trainer.id, method, value, hashOtp(otp), expires]
  );

  // Never log the OTP where logs persist (prod observability) — dev only.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[claim] OTP for trainer ${trainerSlug} -> ${otp}`);
  }
  return NextResponse.json({ ok: true, ...(EXPOSE_OTP ? { devOtp: otp } : {}) });
}
