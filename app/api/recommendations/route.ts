import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const db = getDb();

  const rl = rateLimit(`recs:${clientIp(req)}`, 8, 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "Too many submissions. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.website) return NextResponse.json({ ok: true });

  const trainerSlug = String(body.trainer || "").trim();
  const text = String(body.body || "").trim();
  if (text.length < 10)
    return NextResponse.json(
      { error: "Please write at least a sentence about why you recommend them." },
      { status: 400 }
    );

  const trainer = db
    .prepare("SELECT id FROM trainers WHERE slug = ?")
    .get(trainerSlug) as { id: number } | undefined;
  if (!trainer)
    return NextResponse.json({ error: "Unknown trainer" }, { status: 404 });

  const jar = await cookies();
  let anonId = jar.get("anon_id")?.value;
  if (!anonId) anonId = crypto.randomUUID();

  const primary = db
    .prepare(
      "SELECT activity_id FROM trainer_activities WHERE trainer_id = ? LIMIT 1"
    )
    .get(trainer.id) as { activity_id: number } | undefined;

  db.prepare(
    `INSERT INTO recommendations
      (trainer_id, activity_id, anon_id, rating, would_recommend, body, price_paid, price_unit, trained_duration, status)
     VALUES (?,?,?,?,?,?,?,?,?, 'approved')`
  ).run(
    trainer.id,
    primary?.activity_id ?? null,
    anonId,
    body.rating ? Number(body.rating) : null,
    body.would_recommend === false ? 0 : 1,
    text,
    body.price_paid ? Number(body.price_paid) : null,
    body.price_unit ? String(body.price_unit) : null,
    body.trained_duration ? String(body.trained_duration) : null
  );

  const res = NextResponse.json({ ok: true });
  res.cookies.set("anon_id", anonId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
