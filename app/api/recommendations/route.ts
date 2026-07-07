import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { getAnonId, setAnonCookie } from "@/lib/anon";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const d = await db();

  const rl = await rateLimit(`recs:${clientIp(req)}`, 8, 60_000);
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
  const text = String(body.body || "").trim().slice(0, 2000);
  if (text.length < 10)
    return NextResponse.json(
      { error: "Please write at least a sentence about why you recommend them." },
      { status: 400 }
    );

  const trainer = await d.get<{ id: number }>(
    "SELECT id FROM trainers WHERE slug = ?",
    [trainerSlug]
  );
  if (!trainer)
    return NextResponse.json({ error: "Unknown trainer" }, { status: 404 });

  const anonId = await getAnonId();

  const primary = await d.get<{ activity_id: number }>(
    "SELECT activity_id FROM trainer_activities WHERE trainer_id = ? LIMIT 1",
    [trainer.id]
  );

  await d.run(
    `INSERT INTO recommendations
      (trainer_id, activity_id, anon_id, rating, would_recommend, body, price_paid, price_unit, trained_duration, status)
     VALUES (?,?,?,?,?,?,?,?,?, 'approved')`,
    [
      trainer.id,
      primary?.activity_id ?? null,
      anonId,
      body.rating ? Number(body.rating) : null,
      body.would_recommend === false ? 0 : 1,
      text,
      body.price_paid ? Number(body.price_paid) : null,
      body.price_unit ? String(body.price_unit) : null,
      body.trained_duration ? String(body.trained_duration) : null,
    ]
  );

  return setAnonCookie(NextResponse.json({ ok: true }), anonId);
}
