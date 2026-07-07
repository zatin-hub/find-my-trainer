import { NextRequest, NextResponse } from "next/server";
import { listTrainers } from "@/lib/queries";
import { db } from "@/lib/database";
import { slugify } from "@/lib/db";
import { getAnonId, setAnonCookie } from "@/lib/anon";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { notifyMatchingSeekers } from "@/lib/match";
import { inCity } from "@/lib/cities";

export const dynamic = "force-dynamic";

// Parse a comma-separated multi-value param into a clean string[] (or undefined).
function listParam(sp: URLSearchParams, key: string): string[] | undefined {
  const raw = sp.get(key);
  if (!raw) return undefined;
  const vals = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return vals.length ? vals : undefined;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const trainers = await listTrainers({
    city: sp.get("city") || undefined,
    activity: listParam(sp, "activity"),
    area: listParam(sp, "area"),
    mode: listParam(sp, "mode"),
    gender: listParam(sp, "gender"),
    q: sp.get("q") || undefined,
    maxPrice: sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined,
    minRating: sp.get("minRating") ? Number(sp.get("minRating")) : undefined,
  });
  return NextResponse.json({ trainers });
}

export async function POST(req: NextRequest) {
  const d = await db();

  const rl = await rateLimit(`trainers:${clientIp(req)}`, 5, 60_000);
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
  const instagram = String(body.contact_instagram || "")
    .trim()
    .replace(/^@/, "");
  const activitySlugs = Array.isArray(body.activities)
    ? (body.activities as string[])
    : [];

  if (name.length < 2 || name.length > 80)
    return NextResponse.json(
      { error: "Name must be 2–80 characters" },
      { status: 400 }
    );
  if (!areaSlug)
    return NextResponse.json({ error: "Area is required" }, { status: 400 });
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(instagram))
    return NextResponse.json(
      { error: "A valid Instagram handle is required" },
      { status: 400 }
    );
  if (activitySlugs.length === 0)
    return NextResponse.json(
      { error: "Pick at least one activity" },
      { status: 400 }
    );

  const area = await d.get<{
    id: number;
    lat: number;
    lng: number;
    city: string;
  }>("SELECT id, lat, lng, city FROM areas WHERE slug = ?", [areaSlug]);
  if (!area)
    return NextResponse.json({ error: "Unknown area" }, { status: 400 });

  // anon contributor id
  const anonId = await getAnonId();

  // unique slug
  let slug = slugify(name);
  let n = 2;
  while (await d.get("SELECT 1 FROM trainers WHERE slug = ?", [slug])) {
    slug = `${slugify(name)}-${n++}`;
  }

  // Use the exact pin only if it's a real number inside Bengaluru; otherwise
  // fall back to the area centroid with a little jitter (and reject junk coords).
  const rawLat = typeof body.lat === "number" ? body.lat : null;
  const rawLng = typeof body.lng === "number" ? body.lng : null;
  const usePin =
    rawLat != null && rawLng != null && inCity(rawLat, rawLng, area.city);
  const lat = usePin ? rawLat! : area.lat + (Math.random() - 0.5) * 0.012;
  const lng = usePin ? rawLng! : area.lng + (Math.random() - 0.5) * 0.012;

  const customActivity = body.custom_activity
    ? String(body.custom_activity).trim().slice(0, 40) || null
    : null;

  const info = await d.run(
    `INSERT INTO trainers
      (slug, name, gender, bio, area_id, lat, lng, modes, languages,
       contact_instagram, price_min, price_max, price_unit, custom_activity,
       status, created_by_anon)
     VALUES (@slug,@name,@gender,@bio,@area_id,@lat,@lng,@modes,@languages,
       @contact_instagram,@price_min,@price_max,@price_unit,@custom_activity,
       'approved',@anon)`,
    {
      slug,
      name,
      gender: body.gender ? String(body.gender) : null,
      bio: body.bio ? String(body.bio).slice(0, 600) : null,
      area_id: area.id,
      lat,
      lng,
      custom_activity: customActivity,
      modes: JSON.stringify(Array.isArray(body.modes) ? body.modes : []),
      languages: JSON.stringify(
        Array.isArray(body.languages) ? body.languages : []
      ),
      contact_instagram: instagram,
      price_min: body.price_min ? Number(body.price_min) : null,
      price_max: body.price_max ? Number(body.price_max) : null,
      price_unit: body.price_unit ? String(body.price_unit) : null,
      anon: anonId,
    }
  );

  const trainerId = Number(info.lastInsertRowid);
  for (const a of activitySlugs) {
    await d.run(
      "INSERT OR IGNORE INTO trainer_activities (trainer_id, activity_id) VALUES (?, (SELECT id FROM activities WHERE slug = ?))",
      [trainerId, a]
    );
  }

  // Optional first recommendation submitted alongside the trainer.
  if (body.recommendation && String(body.recommendation).trim().length >= 10) {
    const primaryActivity = await d.get<{ id: number }>(
      "SELECT id FROM activities WHERE slug = ?",
      [activitySlugs[0]]
    );
    await d.run(
      `INSERT INTO recommendations
        (trainer_id, activity_id, anon_id, rating, body, price_paid, price_unit, trained_duration, status)
       VALUES (?,?,?,?,?,?,?,?, 'approved')`,
      [
        trainerId,
        primaryActivity?.id ?? null,
        anonId,
        body.rating ? Number(body.rating) : null,
        String(body.recommendation).trim().slice(0, 2000),
        body.price_paid ? Number(body.price_paid) : null,
        body.price_unit ? String(body.price_unit) : null,
        body.trained_duration ? String(body.trained_duration) : null,
      ]
    );
  }

  // Fire seeker-pin alerts for anyone whose saved search this trainer matches.
  try {
    await notifyMatchingSeekers(trainerId);
  } catch (e) {
    console.error("[match] notify failed", e);
  }

  return setAnonCookie(NextResponse.json({ ok: true, slug }), anonId);
}
