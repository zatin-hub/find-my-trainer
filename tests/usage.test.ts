import { describe, it, expect, afterAll } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const DB = path.join(os.tmpdir(), `fmt-usage-${process.pid}-${Date.now()}.db`);
process.env.FMT_DB_PATH = DB;

const { bumpUsage, getUsage } = await import("@/lib/usage");

afterAll(() => {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(DB + suffix);
    } catch {
      /* ignore */
    }
  }
});

describe("usage counters", () => {
  it("increments and aggregates per day/kind", async () => {
    await bumpUsage("ola_tile", 25);
    await bumpUsage("ola_tile", 5);
    await bumpUsage("geocode_fwd_ola");
    const days = await getUsage(7);
    expect(days.length).toBe(1);
    expect(days[0].counts.ola_tile).toBe(30);
    expect(days[0].counts.geocode_fwd_ola).toBe(1);
  });

  it("never throws from the hot path (bad db state is swallowed)", async () => {
    await expect(bumpUsage("geocode_rev_live", 1)).resolves.toBeUndefined();
  });
});
