import { describe, it, expect, afterAll } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const DB = path.join(os.tmpdir(), `fmt-unsub-${process.pid}-${Date.now()}.db`);
process.env.FMT_DB_PATH = DB;

const { unsubscribeSig, verifyUnsubscribeSig, unsubscribeUrl, deleteSeekerPin } =
  await import("@/lib/unsubscribe");
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

function makePin(email: string): number {
  return Number(
    dbi
      .prepare("INSERT INTO seeker_pins (email, radius_m) VALUES (?, 3000)")
      .run(email).lastInsertRowid
  );
}

describe("unsubscribe signatures", () => {
  it("round-trips for the minted (pin, email) pair", () => {
    expect(verifyUnsubscribeSig(7, "a@b.com", unsubscribeSig(7, "a@b.com"))).toBe(
      true
    );
  });
  it("is case/whitespace-insensitive on email (matches storage normalization)", () => {
    expect(
      verifyUnsubscribeSig(7, "a@b.com", unsubscribeSig(7, "  A@B.COM "))
    ).toBe(true);
  });
  it("rejects a tampered or transplanted signature", () => {
    const sig = unsubscribeSig(7, "a@b.com");
    expect(verifyUnsubscribeSig(8, "a@b.com", sig)).toBe(false); // other pin
    expect(verifyUnsubscribeSig(7, "x@y.com", sig)).toBe(false); // other email
    expect(verifyUnsubscribeSig(7, "a@b.com", sig.slice(0, -1) + "0")).toBe(false);
    expect(verifyUnsubscribeSig(7, "a@b.com", "")).toBe(false);
  });
  it("never leaks the email into the URL", () => {
    const url = unsubscribeUrl("https://x.test", 7, "leak@me.com");
    expect(url).not.toContain("leak");
    expect(url).toContain("pin=7");
    expect(url).toContain("sig=");
  });
});

describe("deleteSeekerPin", () => {
  it("deletes the pin and its notifications", async () => {
    const pinId = makePin("gone@x.com");
    // Notification references a trainer; seed data provides none reliably, so
    // insert a minimal approved trainer for the FK.
    const area = dbi.prepare("SELECT id, lat, lng FROM areas LIMIT 1").get() as {
      id: number;
      lat: number;
      lng: number;
    };
    const tid = Number(
      dbi
        .prepare(
          `INSERT INTO trainers (slug, name, area_id, lat, lng, modes, languages, status)
           VALUES ('unsub-t','unsub-t',?,?,?,'[]','[]','approved')`
        )
        .run(area.id, area.lat, area.lng).lastInsertRowid
    );
    dbi
      .prepare(
        "INSERT INTO notifications (seeker_pin_id, trainer_id, sent) VALUES (?, ?, 1)"
      )
      .run(pinId, tid);

    await deleteSeekerPin(pinId);

    expect(
      dbi.prepare("SELECT COUNT(*) c FROM seeker_pins WHERE id = ?").get(pinId)
    ).toMatchObject({ c: 0 });
    expect(
      dbi
        .prepare("SELECT COUNT(*) c FROM notifications WHERE seeker_pin_id = ?")
        .get(pinId)
    ).toMatchObject({ c: 0 });
  });
  it("is idempotent on unknown ids", async () => {
    await expect(deleteSeekerPin(999999)).resolves.toBeUndefined();
  });
});
