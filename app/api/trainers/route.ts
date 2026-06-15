import { NextRequest, NextResponse } from "next/server";
import { listTrainers } from "@/lib/queries";
import { getDb, slugify } from "@/lib/db";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { notifyMatchingSeekers } from "@/lib/match";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const trainers = listTrainers({
    activity: sp.get("activity") || undefined,
    area: sp.get("area") || undefined,
    mode: sp.get("mode") || undefined,
    gender: sp.get("gender") || undefined,
    q: sp.get("q") || undefined,
    maxPrice: sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined,
    minRating: sp.get("minRating") ? Number(sp.get("minRating")) : undefined,
  });
  return NextResponse.json({ trainers });
}

export async function POST(req: NextRequest) {
  const db = getDb();

  const rl = rateLimit(`trainers:${clientIp(req)}`, 5, 60_000);
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

  // Honeypot: real users never fill this hidden field; bots do.
  if (body.website) return NextResponse.json({ ok: true, slug: "" });

  const name = String(body.name || "").trim();
  const areaSlug = String(body.area || "").trim();
  const activitySlugs = Array.isArray(body.activities)
    ? (body.activities as string[])
    : [];

  if (name.length < 2)
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!areaSlug)
    return NextResponse.json({ error: "Area is required" }, { status: 400 });
  if (activitySlugs.length === 0)
    return NextResponse.json(
      { error: "Pick at least one activity" },
      { status: 400 }
    );

  const area = db
    .prepare("SELECT id, lat, lng FROM areas WHERE slug = ?")
    .get(areaSlug) as { id: number; lat: number; lng: number } | undefined;
  if (!area)
    return NextResponse.json({ error: "Unknown area" }, { status: 400 });

  // anon contributor id
  const jar = await cookies();
  let anonId = jar.get("anon_id")?.value;
  if (!anonId) anonId = crypto.randomUUID();

  // unique slug
  let slug = slugify(name);
  let n = 2;
  while (db.prepare("SELECT 1 FROM trainers WHERE slug = ?").get(slug)) {
    slug = `${slugify(name)}-${n++}`;
  }

  const lat =
    typeof body.lat === "number"
      ? body.lat
      : area.lat + (Math.random() - 0.5) * 0.012;
  const lng =
    typeof body.lng === "number"
      ? body.lng
      : area.lng + (Math.random() - 0.5) * 0.012;

  const info = db
    .prepare(
      `INSERT INTO trainers
        (slug, name, gender, bio, area_id, lat, lng, modes, languages,
         contact_instagram, price_min, price_max, price_unit, status, created_by_anon)
       VALUES (@slug,@name,@gender,@bio,@area_id,@lat,@lng,@modes,@languages,
         @contact_instagram,@price_min,@price_max,@price_unit,'approved',@anon)`
    )
    .run({
      slug,
      name,
      gender: body.gender ? String(body.gender) : null,
      bio: body.bio ? String(body.bio) : null,
      area_id: area.id,
      lat,
      lng,
      modes: JSON.stringify(Array.isArray(body.modes) ? body.modes : []),
      languages: JSON.stringify(
        Array.isArray(body.languages) ? body.languages : []
      ),
      contact_instagram: body.contact_instagram
        ? String(body.contact_instagram).replace(/^@/, "")
        : null,
      price_min: body.price_min ? Number(body.price_min) : null,
      price_max: body.price_max ? Number(body.price_max) : null,
      price_unit: body.price_unit ? String(body.price_unit) : null,
      anon: anonId,
    });

  const trainerId = Number(info.lastInsertRowid);
  const insTA = db.prepare(
    "INSERT OR IGNORE INTO trainer_activities (trainer_id, activity_id) VALUES (?, (SELECT id FROM activities WHERE slug = ?))"
  );
  for (const a of activitySlugs) insTA.run(trainerId, a);

  // Optional first recommendation submitted alongside the trainer.
  if (body.recommendation && String(body.recommendation).trim().length >= 10) {
    const primaryActivityId = db
      .prepare("SELECT id FROM activities WHERE slug = ?")
      .get(activitySlugs[0]) as { id: number } | undefined;
    db.prepare(
      `INSERT INTO recommendations
        (trainer_id, activity_id, anon_id, rating, body, price_paid, price_unit, trained_duration, status)
       VALUES (?,?,?,?,?,?,?,?, 'approved')`
    ).run(
      trainerId,
      primaryActivityId?.id ?? null,
      anonId,
      body.rating ? Number(body.rating) : null,
      String(body.recommendation).trim(),
      body.price_paid ? Number(body.price_paid) : null,
      body.price_unit ? String(body.price_unit) : null,
      body.trained_duration ? String(body.trained_duration) : null
    );
  }

  // Fire seeker-pin alerts for anyone whose saved search this trainer matches.
  try {
    await notifyMatchingSeekers(trainerId);
  } catch (e) {
    console.error("[match] notify failed", e);
  }

  const res = NextResponse.json({ ok: true, slug });
  res.cookies.set("anon_id", anonId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
