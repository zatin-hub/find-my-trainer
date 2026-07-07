import { describe, it, expect, afterAll } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const DB = path.join(os.tmpdir(), `fmt-match-${process.pid}-${Date.now()}.db`);
process.env.FMT_DB_PATH = DB;

const { notifyMatchingSeekers } = await import("@/lib/match");
const { getDb } = await import("@/lib/db");

afterAll(() => {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(DB + suffix);
    } catch {
      /* ignore */
    }
  }
});

const dbi = getDb();

// Fixed geography: put the trainer exactly at a known area's centroid so the
// radius filter is deterministic.
const area = dbi
  .prepare("SELECT id, lat, lng FROM areas WHERE slug = 'indiranagar'")
  .get() as { id: number; lat: number; lng: number };
const farArea = dbi
  .prepare("SELECT id FROM areas WHERE slug = 'whitefield'")
  .get() as { id: number }; // ~12 km from Indiranagar
const activity = dbi.prepare("SELECT id FROM activities LIMIT 1").get() as {
  id: number;
};
const otherActivity = dbi
  .prepare("SELECT id FROM activities WHERE id != ? LIMIT 1")
  .get(activity.id) as { id: number };

function makeTrainer(slug: string, priceMin: number | null, status = "approved") {
  const tid = Number(
    dbi
      .prepare(
        `INSERT INTO trainers (slug, name, area_id, lat, lng, modes, languages, price_min, status)
         VALUES (?,?,?,?,?,'[]','[]',?,?)`
      )
      .run(slug, slug, area.id, area.lat, area.lng, priceMin, status)
      .lastInsertRowid
  );
  dbi
    .prepare(
      "INSERT INTO trainer_activities (trainer_id, activity_id) VALUES (?, ?)"
    )
    .run(tid, activity.id);
  return tid;
}

function makePin(opts: {
  email: string;
  activity_id?: number | null;
  area_id?: number | null;
  radius_m?: number;
  budget_max?: number | null;
}) {
  return Number(
    dbi
      .prepare(
        `INSERT INTO seeker_pins (email, activity_id, area_id, radius_m, budget_max)
         VALUES (?,?,?,?,?)`
      )
      .run(
        opts.email,
        opts.activity_id ?? null,
        opts.area_id ?? null,
        opts.radius_m ?? 3000,
        opts.budget_max ?? null
      ).lastInsertRowid
  );
}

const notifCount = (tid: number) =>
  (
    dbi
      .prepare(
        "SELECT COUNT(*) c FROM notifications WHERE trainer_id = ? AND sent = 1"
      )
      .get(tid) as { c: number }
  ).c;

describe("notifyMatchingSeekers", () => {
  it("notifies an unfiltered pin and records it", async () => {
    const tid = makeTrainer("m-open", 2000);
    makePin({ email: "open@t.dev" });
    const sent = await notifyMatchingSeekers(tid);
    expect(sent).toBeGreaterThanOrEqual(1);
    expect(notifCount(tid)).toBe(sent);
  });

  it("respects the activity filter", async () => {
    const tid = makeTrainer("m-act", 2000);
    // Clean slate: remove pins from earlier tests so counts are exact.
    dbi.prepare("DELETE FROM seeker_pins").run();
    makePin({ email: "right-activity@t.dev", activity_id: activity.id });
    makePin({ email: "wrong-activity@t.dev", activity_id: otherActivity.id });
    expect(await notifyMatchingSeekers(tid)).toBe(1);
  });

  it("respects the budget filter", async () => {
    const tid = makeTrainer("m-budget", 5000);
    dbi.prepare("DELETE FROM seeker_pins").run();
    makePin({ email: "rich@t.dev", budget_max: 6000 });
    makePin({ email: "broke@t.dev", budget_max: 3000 });
    expect(await notifyMatchingSeekers(tid)).toBe(1);
  });

  it("respects the area radius filter", async () => {
    const tid = makeTrainer("m-radius", 2000);
    dbi.prepare("DELETE FROM seeker_pins").run();
    makePin({ email: "near@t.dev", area_id: area.id, radius_m: 3000 });
    makePin({ email: "far@t.dev", area_id: farArea.id, radius_m: 3000 });
    expect(await notifyMatchingSeekers(tid)).toBe(1);
  });

  it("never notifies the same (pin, trainer) twice", async () => {
    const tid = makeTrainer("m-dedup", 2000);
    dbi.prepare("DELETE FROM seeker_pins").run();
    makePin({ email: "once@t.dev" });
    expect(await notifyMatchingSeekers(tid)).toBe(1);
    expect(await notifyMatchingSeekers(tid)).toBe(0); // dedup on re-run
    expect(notifCount(tid)).toBe(1);
  });

  it("sends nothing for unapproved or unknown trainers", async () => {
    dbi.prepare("DELETE FROM seeker_pins").run();
    makePin({ email: "any@t.dev" });
    const hidden = makeTrainer("m-hidden", 2000, "rejected");
    expect(await notifyMatchingSeekers(hidden)).toBe(0);
    expect(await notifyMatchingSeekers(999999)).toBe(0);
  });
});
