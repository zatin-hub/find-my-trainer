-- D1 schema for find-my-trainer. Mirrors lib/db.ts (which auto-creates the
-- same tables for local better-sqlite3). Apply with:
--   wrangler d1 migrations apply find-my-trainer --remote

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
  lng REAL NOT NULL
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

CREATE INDEX IF NOT EXISTS idx_trainers_area ON trainers(area_id);
CREATE INDEX IF NOT EXISTS idx_recs_trainer ON recommendations(trainer_id);
CREATE INDEX IF NOT EXISTS idx_ta_activity ON trainer_activities(activity_id);
-- At most one helpful vote per recommendation per IP (anti-stuffing).
CREATE UNIQUE INDEX IF NOT EXISTS idx_recvotes_rec_ip
  ON rec_votes(recommendation_id, ip_hash) WHERE ip_hash IS NOT NULL;
