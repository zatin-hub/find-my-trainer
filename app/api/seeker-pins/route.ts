import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const db = getDb();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });

  const activityId = body.activity
    ? (
        db
          .prepare("SELECT id FROM activities WHERE slug = ?")
          .get(String(body.activity)) as { id: number } | undefined
      )?.id ?? null
    : null;
  const areaId = body.area
    ? (
        db
          .prepare("SELECT id FROM areas WHERE slug = ?")
          .get(String(body.area)) as { id: number } | undefined
      )?.id ?? null
    : null;

  db.prepare(
    `INSERT INTO seeker_pins (email, activity_id, area_id, radius_m, budget_max)
     VALUES (?,?,?,?,?)`
  ).run(
    email,
    activityId,
    areaId,
    body.radius_m ? Number(body.radius_m) : 3000,
    body.budget_max ? Number(body.budget_max) : null
  );

  // In production this triggers a double opt-in email + cron matching.
  // Locally we just record the pin.
  return NextResponse.json({ ok: true });
}
