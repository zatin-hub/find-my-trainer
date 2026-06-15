import { getDb } from "@/lib/db";
import { distanceMeters } from "@/lib/geo";
import { sendEmail } from "@/lib/notify";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

interface PinRow {
  id: number;
  email: string;
  activity_id: number | null;
  area_id: number | null;
  radius_m: number;
  budget_max: number | null;
  area_lat: number | null;
  area_lng: number | null;
}

/**
 * Notify seekers whose saved alert matches a newly added/updated trainer.
 * Returns the number of new notifications sent.
 */
export async function notifyMatchingSeekers(trainerId: number): Promise<number> {
  const db = getDb();
  const trainer = db
    .prepare(
      `SELECT t.id, t.name, t.slug, t.lat, t.lng, t.price_min
       FROM trainers t WHERE t.id = ? AND t.status = 'approved'`
    )
    .get(trainerId) as
    | {
        id: number;
        name: string;
        slug: string;
        lat: number;
        lng: number;
        price_min: number | null;
      }
    | undefined;
  if (!trainer) return 0;

  const activityIds = (
    db
      .prepare("SELECT activity_id FROM trainer_activities WHERE trainer_id = ?")
      .all(trainerId) as { activity_id: number }[]
  ).map((r) => r.activity_id);

  const pins = db
    .prepare(
      `SELECT sp.id, sp.email, sp.activity_id, sp.area_id, sp.radius_m, sp.budget_max,
              ar.lat AS area_lat, ar.lng AS area_lng
       FROM seeker_pins sp LEFT JOIN areas ar ON ar.id = sp.area_id`
    )
    .all() as PinRow[];

  const insert = db.prepare(
    "INSERT OR IGNORE INTO notifications (seeker_pin_id, trainer_id, sent) VALUES (?, ?, 0)"
  );
  const markSent = db.prepare(
    "UPDATE notifications SET sent = 1 WHERE seeker_pin_id = ? AND trainer_id = ?"
  );

  let sentCount = 0;
  for (const pin of pins) {
    // Activity filter
    if (pin.activity_id && !activityIds.includes(pin.activity_id)) continue;
    // Budget filter
    if (
      pin.budget_max != null &&
      trainer.price_min != null &&
      trainer.price_min > pin.budget_max
    )
      continue;
    // Location filter (skip if pin has a specific area)
    if (pin.area_id && pin.area_lat != null && pin.area_lng != null) {
      const d = distanceMeters(
        pin.area_lat,
        pin.area_lng,
        trainer.lat,
        trainer.lng
      );
      if (d > pin.radius_m) continue;
    }

    // Dedup: only notify once per (pin, trainer)
    const info = insert.run(pin.id, trainerId);
    if (info.changes === 0) continue; // already notified

    const ok = await sendEmail({
      to: pin.email,
      subject: `New trainer match: ${trainer.name}`,
      text: `A trainer matching your alert was just added on findmytrainer.\n\n${trainer.name}\n${BASE}/trainer/${trainer.slug}\n\nYou're receiving this because you set up an alert. Reply to unsubscribe (stub).`,
    });
    if (ok) {
      markSent.run(pin.id, trainerId);
      sentCount++;
    }
  }
  return sentCount;
}
