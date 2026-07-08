import { describe, it, expect, afterAll } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const DB = path.join(os.tmpdir(), `fmt-set-${process.pid}-${Date.now()}.db`);
process.env.FMT_DB_PATH = DB;

const { getSetting, setSetting, getSettings } = await import("@/lib/settings");
const { resolveMapStyle, DEFAULT_STYLE_URL, HYBRID_STYLES } = await import(
  "@/lib/mapstyle"
);

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
  it("batch-reads keys in one call, null for unset", async () => {
    await setSetting("map_style", "fmt-dark");
    const s = await getSettings(["map_provider", "map_style", "missing"]);
    expect(s.map_provider).toBe("hybrid");
    expect(s.map_style).toBe("fmt-dark");
    expect(s.missing).toBeNull();
    expect(await getSettings([])).toEqual({});
  });
});

describe("resolveMapStyle", () => {
  it("defaults to hybrid + fmt-bright when unset", () => {
    expect(resolveMapStyle(null, "key").styleUrl).toBe(DEFAULT_STYLE_URL);
    expect(resolveMapStyle(null, "key").styleUrl).toBe("/fmt-bright.json");
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
  it("resolves hybrid base styles from the allowlist", () => {
    expect(resolveMapStyle(null, undefined, "fmt-dark").styleUrl).toBe(
      "/fmt-dark.json"
    );
    expect(resolveMapStyle(null, undefined, "fiord").styleUrl).toBe(
      HYBRID_STYLES.fiord
    );
  });
  it("falls back to default style on unknown values", () => {
    expect(resolveMapStyle(null, undefined, "neon").styleUrl).toBe(
      DEFAULT_STYLE_URL
    );
    expect(resolveMapStyle(null, undefined, null).styleUrl).toBe(
      DEFAULT_STYLE_URL
    );
  });
  it("keeps hybridStyle through an ola selection (for the admin picker)", () => {
    expect(resolveMapStyle("ola", "k", "fiord").hybridStyle).toBe("fiord");
  });
});
