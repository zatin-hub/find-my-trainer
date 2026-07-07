import { describe, it, expect, afterAll } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

// Point the DB layer at an isolated, auto-seeded temp database before import.
const DB = path.join(os.tmpdir(), `fmt-queries-${process.pid}-${Date.now()}.db`);
process.env.FMT_DB_PATH = DB;

const {
  listTrainers,
  getTrainerBySlug,
  getActivities,
  getAreas,
  findSimilarTrainers,
} = await import("@/lib/queries");

afterAll(() => {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(DB + suffix);
    } catch {
      /* ignore */
    }
  }
});

describe("seed", () => {
  it("seeds the activity taxonomy and areas", async () => {
    expect((await getActivities()).length).toBe(13);
    const areas = await getAreas();
    expect(areas.length).toBe(44); // 20 Bengaluru + 12 Mumbai + 12 Delhi NCR
    expect(areas.every((a) => a.city)).toBe(true);
    const cities = new Set(areas.map((a) => a.city));
    expect(cities).toEqual(new Set(["bengaluru", "mumbai", "delhi-ncr"]));
  });

  it("filters trainers by city (seed data is Bengaluru-only)", async () => {
    expect((await listTrainers({ city: "bengaluru" })).length).toBeGreaterThan(0);
    expect((await listTrainers({ city: "mumbai" })).length).toBe(0);
  });
  it("seeds sample trainers", async () => {
    expect((await listTrainers()).length).toBeGreaterThanOrEqual(10);
  });
});

describe("listTrainers — single filters", () => {
  it("filters by activity (every result has it)", async () => {
    const res = await listTrainers({ activity: ["yoga"] });
    expect(res.length).toBeGreaterThan(0);
    for (const t of res)
      expect(t.activities.some((a) => a.slug === "yoga")).toBe(true);
  });

  it("filters by area", async () => {
    const res = await listTrainers({ area: ["koramangala", "jayanagar"] });
    expect(res.length).toBeGreaterThan(0);
    for (const t of res)
      expect(["Koramangala", "Jayanagar"]).toContain(t.area_name);
  });

  it("filters by mode", async () => {
    const res = await listTrainers({ mode: ["online"] });
    expect(res.length).toBeGreaterThan(0);
    for (const t of res) expect(t.modes).toContain("online");
  });

  it("filters by gender", async () => {
    const res = await listTrainers({ gender: ["female"] });
    expect(res.length).toBeGreaterThan(0);
    for (const t of res) expect(t.gender).toBe("female");
  });

  it("maxPrice excludes pricier trainers", async () => {
    const cap = 3000;
    for (const t of await listTrainers({ maxPrice: cap }))
      if (t.price_min != null) expect(t.price_min).toBeLessThanOrEqual(cap);
  });

  it("minRating keeps only higher-rated trainers", async () => {
    for (const t of await listTrainers({ minRating: 4 }))
      expect(t.avg_rating ?? 0).toBeGreaterThanOrEqual(4);
  });
});

describe("listTrainers — multi-select semantics", () => {
  it("OR within a category (union, deduped)", async () => {
    const yoga = await listTrainers({ activity: ["yoga"] });
    const zumba = await listTrainers({ activity: ["zumba-dance"] });
    const both = await listTrainers({ activity: ["yoga", "zumba-dance"] });
    const ids = new Set(both.map((t) => t.id));
    expect(both.length).toBe(ids.size); // no duplicates
    expect(both.length).toBe(
      new Set([...yoga, ...zumba].map((t) => t.id)).size
    );
    for (const t of both)
      expect(
        t.activities.some((a) => a.slug === "yoga" || a.slug === "zumba-dance")
      ).toBe(true);
  });

  it("AND across categories (activity AND area)", async () => {
    const res = await listTrainers({
      activity: ["yoga", "zumba-dance"],
      area: ["koramangala"],
    });
    for (const t of res) {
      expect(t.area_name).toBe("Koramangala");
      expect(
        t.activities.some((a) => ["yoga", "zumba-dance"].includes(a.slug))
      ).toBe(true);
    }
    expect(res.some((t) => t.slug === "meera-nair")).toBe(true);
  });

  it("accepts a single string for back-compat", async () => {
    const arr = (await listTrainers({ activity: ["yoga"] }))
      .map((t) => t.id)
      .sort();
    const str = (await listTrainers({ activity: "yoga" }))
      .map((t) => t.id)
      .sort();
    expect(str).toEqual(arr);
  });

  it("ignores empty/whitespace filter values", async () => {
    const all = (await listTrainers()).length;
    expect((await listTrainers({ activity: [""], area: ["   "] })).length).toBe(
      all
    );
  });
});

describe("listTrainers — free-text search (q)", () => {
  it("matches trainer name", async () => {
    const res = await listTrainers({ q: "arjun" });
    expect(res.some((t) => t.name.toLowerCase().includes("arjun"))).toBe(true);
  });
  it("matches area name", async () => {
    const res = await listTrainers({ q: "koramangala" });
    expect(res.length).toBeGreaterThan(0);
    for (const t of res)
      expect(t.area_name.toLowerCase()).toContain("koramangala");
  });
  it("matches activity name", async () => {
    const res = await listTrainers({ q: "yoga" });
    expect(res.length).toBeGreaterThan(0);
    for (const t of res)
      expect(
        t.activities.some((a) => a.name.toLowerCase().includes("yoga"))
      ).toBe(true);
  });
});

describe("getTrainerBySlug", () => {
  it("returns a known trainer with activities", async () => {
    const t = await getTrainerBySlug("arjun-rao");
    expect(t).not.toBeNull();
    expect(t!.name).toBe("Arjun Rao");
    expect(t!.activities.length).toBeGreaterThan(0);
  });
  it("returns null for an unknown slug", async () => {
    expect(await getTrainerBySlug("nobody-here")).toBeNull();
  });
});

describe("listTrainers — status visibility (regression)", () => {
  it("never returns rejected/hidden or merged trainers", async () => {
    const { getDb } = await import("@/lib/db");
    const dbi = getDb();
    const area = dbi.prepare("SELECT id FROM areas LIMIT 1").get() as {
      id: number;
    };
    dbi
      .prepare(
        `INSERT INTO trainers (slug, name, area_id, lat, lng, modes, languages, status)
       VALUES (?,?,?,?,?,?,?,?)`
      )
      .run("hidden-zzz", "Hidden ZZZ", area.id, 12.9, 77.6, "[]", "[]", "rejected");
    dbi
      .prepare(
        `INSERT INTO trainers (slug, name, area_id, lat, lng, modes, languages, status)
       VALUES (?,?,?,?,?,?,?,?)`
      )
      .run("merged-zzz", "Merged ZZZ", area.id, 12.9, 77.6, "[]", "[]", "merged");

    const slugs = (await listTrainers()).map((t) => t.slug);
    expect(slugs).not.toContain("hidden-zzz");
    expect(slugs).not.toContain("merged-zzz");
    expect(await listTrainers({ q: "hidden zzz" })).toEqual([]);
  });
});

describe("findSimilarTrainers", () => {
  it("matches an exact existing name", async () => {
    expect(
      (await findSimilarTrainers("Arjun Rao")).some((m) => m.slug === "arjun-rao")
    ).toBe(true);
  });
  it("returns nothing for empty input", async () => {
    expect(await findSimilarTrainers("")).toEqual([]);
  });
});
