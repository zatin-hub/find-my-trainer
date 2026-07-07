import { db } from "@/lib/database";
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
  const d = await db();
  const trainer = await d.get<{
    id: number;
    name: string;
    slug: string;
    lat: number;
    lng: number;
    price_min: number | null;
  }>(
    `SELECT t.id, t.name, t.slug, t.lat, t.lng, t.price_min
     FROM trainers t WHERE t.id = ? AND t.status = 'approved'`,
    [trainerId]
  );
  if (!trainer) return 0;

  const activityIds = (
    await d.all<{ activity_id: number }>(
      "SELECT activity_id FROM trainer_activities WHERE trainer_id = ?",
      [trainerId]
    )
  ).map((r) => r.activity_id);

  const pins = await d.all<PinRow>(
    `SELECT sp.id, sp.email, sp.activity_id, sp.area_id, sp.radius_m, sp.budget_max,
            ar.lat AS area_lat, ar.lng AS area_lng
     FROM seeker_pins sp LEFT JOIN areas ar ON ar.id = sp.area_id`
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
    const info = await d.run(
      "INSERT OR IGNORE INTO notifications (seeker_pin_id, trainer_id, sent) VALUES (?, ?, 0)",
      [pin.id, trainerId]
    );
    if (info.changes === 0) continue; // already notified

    const ok = await sendEmail({
      to: pin.email,
      subject: `New trainer match: ${trainer.name}`,
      text: `A trainer matching your alert was just added on findmytrainer.\n\n${trainer.name}\n${BASE}/trainer/${trainer.slug}\n\nYou're receiving this because you set up an alert. Reply to unsubscribe (stub).`,
    });
    if (ok) {
      await d.run(
        "UPDATE notifications SET sent = 1 WHERE seeker_pin_id = ? AND trainer_id = ?",
        [pin.id, trainerId]
      );
      sentCount++;
    }
  }
  return sentCount;
}
