import { describe, it, expect, afterAll } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const DB = path.join(os.tmpdir(), `fmt-votes-${process.pid}-${Date.now()}.db`);
process.env.FMT_DB_PATH = DB;

const { applyVote, hashIp } = await import("@/lib/votes");
const { getDb } = await import("@/lib/db");

const recId = (
  getDb().prepare("SELECT id FROM recommendations LIMIT 1").get() as {
    id: number;
  }
).id;

afterAll(() => {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(DB + suffix);
    } catch {
      /* ignore */
    }
  }
});

describe("applyVote", () => {
  const ipA = hashIp("1.1.1.1");
  const ipB = hashIp("2.2.2.2");

  it("counts a first vote", async () => {
    const r = await applyVote(recId, "anonA", ipA);
    expect(r.voted).toBe(true);
    expect(r.count).toBe(1);
  });

  it("a visitor toggles their own vote off", async () => {
    const r = await applyVote(recId, "anonA", ipA);
    expect(r.voted).toBe(false);
    expect(r.count).toBe(0);
  });

  it("blocks vote stuffing from the same IP via fresh anon ids", async () => {
    expect((await applyVote(recId, "stuffer1", ipA)).count).toBe(1);
    // Same IP, new cookie → must NOT inflate.
    expect((await applyVote(recId, "stuffer2", ipA)).count).toBe(1);
    expect((await applyVote(recId, "stuffer3", ipA)).count).toBe(1);
    // The cookie-less stuffer's own toggle state stays false.
    expect((await applyVote(recId, "stuffer4", ipA)).voted).toBe(false);
  });

  it("counts a genuine second voter from a different IP", async () => {
    const r = await applyVote(recId, "anonB", ipB);
    expect(r.voted).toBe(true);
    expect(r.count).toBe(2);
  });

  it("persists helpful_count on the recommendation", () => {
    const row = getDb()
      .prepare("SELECT helpful_count FROM recommendations WHERE id = ?")
      .get(recId) as { helpful_count: number };
    expect(row.helpful_count).toBe(2);
  });
});
