import { describe, it, expect, afterAll } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const DB = path.join(os.tmpdir(), `fmt-set-${process.pid}-${Date.now()}.db`);
process.env.FMT_DB_PATH = DB;

const { getSetting, setSetting } = await import("@/lib/settings");
const { resolveMapStyle, OPENFREEMAP_STYLE } = await import("@/lib/mapstyle");

afterAll(() => {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(DB + suffix);
    } catch {
      /* ignore */
    }
  }
});

describe("settings store", () => {
  it("returns null for unset keys", async () => {
    expect(await getSetting("nope")).toBeNull();
  });
  it("round-trips and upserts", async () => {
    await setSetting("map_provider", "ola");
    expect(await getSetting("map_provider")).toBe("ola");
    await setSetting("map_provider", "hybrid");
    expect(await getSetting("map_provider")).toBe("hybrid");
  });
});

describe("resolveMapStyle", () => {
  it("defaults to hybrid (OpenFreeMap) when unset", () => {
    expect(resolveMapStyle(null, "key").styleUrl).toBe(OPENFREEMAP_STYLE);
    expect(resolveMapStyle(null, "key").provider).toBe("hybrid");
  });
  it("uses Ola tiles only when selected AND a key exists", () => {
    const r = resolveMapStyle("ola", "k123");
    expect(r.provider).toBe("ola");
    expect(r.styleUrl).toContain("api.olamaps.io");
    expect(r.styleUrl).toContain("api_key=k123");
  });
  it("falls back to hybrid when ola selected without a key", () => {
    expect(resolveMapStyle("ola", undefined).provider).toBe("hybrid");
  });
  it("ignores unknown provider values", () => {
    expect(resolveMapStyle("google", "k").provider).toBe("hybrid");
  });
});
