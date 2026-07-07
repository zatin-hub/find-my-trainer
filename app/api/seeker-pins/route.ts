import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const d = await db();

  const rl = await rateLimit(`seeker:${clientIp(req)}`, 5, 60_000);
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

  const email = String(body.email || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });

  const activityId = body.activity
    ? (
        await d.get<{ id: number }>(
          "SELECT id FROM activities WHERE slug = ?",
          [String(body.activity)]
        )
      )?.id ?? null
    : null;
  const areaId = body.area
    ? (
        await d.get<{ id: number }>("SELECT id FROM areas WHERE slug = ?", [
          String(body.area),
        ])
      )?.id ?? null
    : null;

  await d.run(
    `INSERT INTO seeker_pins (email, activity_id, area_id, radius_m, budget_max)
     VALUES (?,?,?,?,?)`,
    [
      email,
      activityId,
      areaId,
      body.radius_m ? Number(body.radius_m) : 3000,
      body.budget_max ? Number(body.budget_max) : null,
    ]
  );

  // In production this triggers a double opt-in email + cron matching.
  // Locally we just record the pin.
  return NextResponse.json({ ok: true });
}
