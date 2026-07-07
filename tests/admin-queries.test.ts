import { describe, it, expect, afterAll } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const DB = path.join(os.tmpdir(), `fmt-admin-${process.pid}-${Date.now()}.db`);
process.env.FMT_DB_PATH = DB;

const { adminListTrainers, adminStats } = await import("@/lib/queries");

afterAll(() => {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(DB + suffix);
    } catch {
      /* ignore */
    }
  }
});

describe("adminListTrainers", () => {
  it("returns rows with a computed risk assessment, sorted high-first", async () => {
    const rows = await adminListTrainers();
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(["low", "medium", "high"]).toContain(r.fake_level);
      expect(r.fake_score).toBeGreaterThanOrEqual(0);
      expect(r.fake_score).toBeLessThanOrEqual(100);
      expect(Array.isArray(r.fake_reasons)).toBe(true);
    }
    // Sorted descending by score.
    for (let i = 1; i < rows.length; i++)
      expect(rows[i - 1].fake_score).toBeGreaterThanOrEqual(rows[i].fake_score);
  });
});

describe("adminStats", () => {
  it("reports consistent counts", async () => {
    const s = await adminStats();
    expect(s.trainers_total).toBeGreaterThan(0);
    expect(s.trainers_total).toBeGreaterThanOrEqual(s.trainers_approved);
    expect(s.recs_total).toBeGreaterThanOrEqual(s.recs_pending);
    expect(s.reports_open).toBeGreaterThanOrEqual(0);
  });
});
