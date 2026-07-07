import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { ACTIVITIES, AREAS, TRAINERS } from "@/data/seed";

// FMT_DB_PATH lets tests point at an isolated database; unset in normal use.
const DB_PATH = process.env.FMT_DB_PATH || path.join(process.cwd(), "data", "app.db");
const DATA_DIR = path.dirname(DB_PATH);

// Singleton across hot-reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var __fmtDb: Database.Database | undefined;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function init(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      city TEXT NOT NULL DEFAULT 'bengaluru'
    );

    CREATE TABLE IF NOT EXISTS trainers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      gender TEXT,
      bio TEXT,
      area_id INTEGER NOT NULL REFERENCES areas(id),
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      modes TEXT NOT NULL DEFAULT '[]',
      languages TEXT NOT NULL DEFAULT '[]',
      contact_instagram TEXT,
      contact_phone TEXT,
      price_min INTEGER,
      price_max INTEGER,
      price_unit TEXT,
      status TEXT NOT NULL DEFAULT 'approved',
      claimed INTEGER NOT NULL DEFAULT 0,
      verified INTEGER NOT NULL DEFAULT 0,
      claim_token TEXT,
      merged_into INTEGER,
      created_by_anon TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trainer_activities (
      trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
      activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      PRIMARY KEY (trainer_id, activity_id)
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
      activity_id INTEGER REFERENCES activities(id),
      anon_id TEXT,
      rating INTEGER,
      would_recommend INTEGER NOT NULL DEFAULT 1,
      body TEXT NOT NULL,
      price_paid INTEGER,
      price_unit TEXT,
      trained_duration TEXT,
      helpful_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'approved',
      reply TEXT,
      replied_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS seeker_pins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      activity_id INTEGER REFERENCES activities(id),
      area_id INTEGER REFERENCES areas(id),
      radius_m INTEGER NOT NULL DEFAULT 3000,
      budget_max INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rec_votes (
      recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
      anon_id TEXT NOT NULL,
      ip_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (recommendation_id, anon_id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      reason TEXT,
      anon_id TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seeker_pin_id INTEGER NOT NULL REFERENCES seeker_pins(id) ON DELETE CASCADE,
      trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
      channel TEXT NOT NULL DEFAULT 'email',
      sent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (seeker_pin_id, trainer_id)
    );

    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
      contact_method TEXT NOT NULL,
      contact_value TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      verified_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_trainers_area ON trainers(area_id);
    CREATE INDEX IF NOT EXISTS idx_recs_trainer ON recommendations(trainer_id);
    CREATE INDEX IF NOT EXISTS idx_ta_activity ON trainer_activities(activity_id);
  `);

  migrate(db);
  seedIfEmpty(db);
  return db;
}

// Idempotent column additions for databases created before these columns existed.
function migrate(db: Database.Database) {
  const cols = [
    "ALTER TABLE trainers ADD COLUMN claim_token TEXT",
    "ALTER TABLE trainers ADD COLUMN contact_phone TEXT",
    "ALTER TABLE trainers ADD COLUMN merged_into INTEGER",
    "ALTER TABLE recommendations ADD COLUMN reply TEXT",
    "ALTER TABLE recommendations ADD COLUMN replied_at TEXT",
    "ALTER TABLE rec_votes ADD COLUMN ip_hash TEXT",
    "ALTER TABLE trainers ADD COLUMN verified_at TEXT",
    "ALTER TABLE trainers ADD COLUMN ig_exists INTEGER",
    "ALTER TABLE trainers ADD COLUMN ig_followers INTEGER",
    "ALTER TABLE trainers ADD COLUMN ig_checked_at TEXT",
    "ALTER TABLE trainers ADD COLUMN custom_activity TEXT",
    "ALTER TABLE areas ADD COLUMN city TEXT NOT NULL DEFAULT 'bengaluru'",
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS usage_counters (
      day TEXT NOT NULL,
      kind TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, kind)
    )`,
  ];
  for (const sql of cols) {
    try {
      db.exec(sql);
    } catch {
      // column already exists — ignore
    }
  }

  // Idempotently ensure every seeded area exists with the right city. This
  // backfills new-city areas (Mumbai, Delhi NCR) into databases created before
  // multi-city support, without disturbing existing rows or trainers.
  const insArea = db.prepare(
    "INSERT OR IGNORE INTO areas (slug, name, lat, lng, city) VALUES (?, ?, ?, ?, ?)"
  );
  const setCity = db.prepare("UPDATE areas SET city = ? WHERE slug = ?");
  const syncAreas = db.transaction(() => {
    for (const a of AREAS) {
      insArea.run(a.slug, a.name, a.lat, a.lng, a.city);
      setCity.run(a.city, a.slug);
    }
  });
  try {
    syncAreas();
  } catch {
    // ignore — non-fatal
  }
  // At most one vote per recommendation per IP (anti-stuffing). Partial index
  // excludes legacy rows with a null ip_hash. Created after the column exists.
  try {
    db.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_recvotes_rec_ip ON rec_votes(recommendation_id, ip_hash) WHERE ip_hash IS NOT NULL"
    );
  } catch {
    // ignore
  }
}

function seedIfEmpty(db: Database.Database) {
  const count = (db.prepare("SELECT COUNT(*) AS c FROM activities").get() as { c: number }).c;
  if (count > 0) return;

  const insActivity = db.prepare(
    "INSERT INTO activities (slug, name, icon) VALUES (?, ?, ?)"
  );
  const insArea = db.prepare(
    "INSERT OR IGNORE INTO areas (slug, name, lat, lng, city) VALUES (?, ?, ?, ?, ?)"
  );
  const insTrainer = db.prepare(`
    INSERT INTO trainers
      (slug, name, gender, bio, area_id, lat, lng, modes, languages,
       contact_instagram, price_min, price_max, price_unit, status, verified)
    VALUES
      (@slug, @name, @gender, @bio, @area_id, @lat, @lng, @modes, @languages,
       @contact_instagram, @price_min, @price_max, @price_unit, 'approved', 0)
  `);
  const insTA = db.prepare(
    "INSERT OR IGNORE INTO trainer_activities (trainer_id, activity_id) VALUES (?, ?)"
  );
  const insRec = db.prepare(`
    INSERT INTO recommendations
      (trainer_id, activity_id, rating, would_recommend, body, price_paid,
       price_unit, trained_duration, helpful_count, status)
    VALUES
      (@trainer_id, @activity_id, @rating, 1, @body, @price_paid,
       @price_unit, @trained_duration, @helpful_count, 'approved')
  `);

  const seed = db.transaction(() => {
    for (const a of ACTIVITIES) insActivity.run(a.slug, a.name, a.icon);
    for (const a of AREAS) insArea.run(a.slug, a.name, a.lat, a.lng, a.city);

    const activityIdBySlug = new Map<string, number>();
    for (const row of db.prepare("SELECT id, slug FROM activities").all() as {
      id: number;
      slug: string;
    }[])
      activityIdBySlug.set(row.slug, row.id);

    const areaBySlug = new Map<string, { id: number; lat: number; lng: number }>();
    for (const row of db.prepare("SELECT id, slug, lat, lng FROM areas").all() as {
      id: number;
      slug: string;
      lat: number;
      lng: number;
    }[])
      areaBySlug.set(row.slug, { id: row.id, lat: row.lat, lng: row.lng });

    const usedSlugs = new Set<string>();
    for (const t of TRAINERS) {
      const area = areaBySlug.get(t.area)!;
      let slug = slugify(t.name);
      let n = 2;
      while (usedSlugs.has(slug)) slug = `${slugify(t.name)}-${n++}`;
      usedSlugs.add(slug);

      // Jitter the pin slightly around the area centroid so markers don't stack.
      const lat = area.lat + (Math.random() - 0.5) * 0.012;
      const lng = area.lng + (Math.random() - 0.5) * 0.012;

      const info = insTrainer.run({
        slug,
        name: t.name,
        gender: t.gender,
        bio: t.bio,
        area_id: area.id,
        lat,
        lng,
        modes: JSON.stringify(t.modes),
        languages: JSON.stringify(t.languages),
        contact_instagram: t.instagram ?? null,
        price_min: t.price_min,
        price_max: t.price_max,
        price_unit: t.price_unit,
      });
      const trainerId = Number(info.lastInsertRowid);

      for (const slugA of t.activities) {
        const aid = activityIdBySlug.get(slugA);
        if (aid) insTA.run(trainerId, aid);
      }
      const primaryActivityId = activityIdBySlug.get(t.activities[0]) ?? null;
      for (const r of t.recommendations) {
        insRec.run({
          trainer_id: trainerId,
          activity_id: primaryActivityId,
          rating: r.rating,
          body: r.body,
          price_paid: r.price_paid,
          price_unit: r.price_unit,
          trained_duration: r.trained_duration,
          helpful_count: r.helpful,
        });
      }
    }
  });
  seed();
}

export function getDb(): Database.Database {
  if (!global.__fmtDb) global.__fmtDb = init();
  return global.__fmtDb;
}

export { slugify };
