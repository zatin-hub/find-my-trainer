import { describe, it, expect, afterAll } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const DB = path.join(os.tmpdir(), `fmt-mod-${process.pid}-${Date.now()}.db`);
process.env.FMT_DB_PATH = DB;

const { deleteTrainerCascade, deleteRecommendationCascade } = await import(
  "@/lib/moderation"
);
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
const count = (sql: string, id: number) =>
  (dbi.prepare(sql).get(id) as { c: number }).c;

// Build a trainer with one row in every child table, so the cascade has
// something real to delete in each.
function makeTrainerWithChildren(tag: string) {
  const area = dbi.prepare("SELECT id FROM areas LIMIT 1").get() as { id: number };
  const activity = dbi.prepare("SELECT id FROM activities LIMIT 1").get() as {
    id: number;
  };
  const tid = Number(
    dbi
      .prepare(
        `INSERT INTO trainers (slug, name, area_id, lat, lng, modes, languages, status)
         VALUES (?,?,?,?,?,?,?, 'approved')`
      )
      .run(`del-${tag}`, `Del ${tag}`, area.id, 12.9, 77.6, "[]", "[]")
      .lastInsertRowid
  );
  const rid = Number(
    dbi
      .prepare(
        "INSERT INTO recommendations (trainer_id, body, status) VALUES (?, 'test rec', 'approved')"
      )
      .run(tid).lastInsertRowid
  );
  dbi
    .prepare(
      "INSERT INTO trainer_activities (trainer_id, activity_id) VALUES (?, ?)"
    )
    .run(tid, activity.id);
  dbi
    .prepare(
      "INSERT INTO rec_votes (recommendation_id, anon_id, ip_hash) VALUES (?, 'anon-x', 'hash-x')"
    )
    .run(rid);
  dbi
    .prepare(
      "INSERT INTO claims (trainer_id, contact_method, contact_value, otp_hash, expires_at) VALUES (?, 'email', 'x@y.z', 'h', datetime('now'))"
    )
    .run(tid);
  dbi
    .prepare(
      "INSERT INTO reports (target_type, target_id, reason) VALUES ('trainer', ?, 'spam')"
    )
    .run(tid);
  const pinId = Number(
    dbi
      .prepare("INSERT INTO seeker_pins (email) VALUES ('pin@test.dev')")
      .run().lastInsertRowid
  );
  dbi
    .prepare(
      "INSERT OR IGNORE INTO notifications (seeker_pin_id, trainer_id, sent) VALUES (?, ?, 1)"
    )
    .run(pinId, tid);
  return { tid, rid };
}

describe("deleteTrainerCascade", () => {
  it("removes the trainer and every child row", async () => {
    const { tid, rid } = makeTrainerWithChildren("a");
    await deleteTrainerCascade(tid);

    expect(count("SELECT COUNT(*) c FROM trainers WHERE id = ?", tid)).toBe(0);
    expect(
      count("SELECT COUNT(*) c FROM recommendations WHERE trainer_id = ?", tid)
    ).toBe(0);
    expect(
      count("SELECT COUNT(*) c FROM trainer_activities WHERE trainer_id = ?", tid)
    ).toBe(0);
    expect(
      count("SELECT COUNT(*) c FROM rec_votes WHERE recommendation_id = ?", rid)
    ).toBe(0);
    expect(count("SELECT COUNT(*) c FROM claims WHERE trainer_id = ?", tid)).toBe(0);
    expect(
      count("SELECT COUNT(*) c FROM notifications WHERE trainer_id = ?", tid)
    ).toBe(0);
    expect(
      count(
        "SELECT COUNT(*) c FROM reports WHERE target_type = 'trainer' AND target_id = ?",
        tid
      )
    ).toBe(0);
  });

  it("does not touch other trainers or their data", async () => {
    const keep = makeTrainerWithChildren("keep");
    const gone = makeTrainerWithChildren("gone");
    const before = count("SELECT COUNT(*) c FROM trainers WHERE 1 = ?", 1);

    await deleteTrainerCascade(gone.tid);

    expect(count("SELECT COUNT(*) c FROM trainers WHERE 1 = ?", 1)).toBe(before - 1);
    expect(count("SELECT COUNT(*) c FROM trainers WHERE id = ?", keep.tid)).toBe(1);
    expect(
      count("SELECT COUNT(*) c FROM recommendations WHERE trainer_id = ?", keep.tid)
    ).toBe(1);
    expect(
      count("SELECT COUNT(*) c FROM rec_votes WHERE recommendation_id = ?", keep.rid)
    ).toBe(1);
  });
});

describe("deleteRecommendationCascade", () => {
  it("removes the recommendation, its votes and reports — trainer stays", async () => {
    const { tid, rid } = makeTrainerWithChildren("rec");
    dbi
      .prepare(
        "INSERT INTO reports (target_type, target_id, reason) VALUES ('recommendation', ?, 'fake')"
      )
      .run(rid);

    await deleteRecommendationCascade(rid);

    expect(count("SELECT COUNT(*) c FROM recommendations WHERE id = ?", rid)).toBe(0);
    expect(
      count("SELECT COUNT(*) c FROM rec_votes WHERE recommendation_id = ?", rid)
    ).toBe(0);
    expect(
      count(
        "SELECT COUNT(*) c FROM reports WHERE target_type = 'recommendation' AND target_id = ?",
        rid
      )
    ).toBe(0);
    expect(count("SELECT COUNT(*) c FROM trainers WHERE id = ?", tid)).toBe(1);
  });
});
