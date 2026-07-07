-- Daily usage counters for external-provider budgeting (Ola tiles/geocode,
-- cache hit rates). One row per (day, kind); atomic upsert increments.
CREATE TABLE IF NOT EXISTS usage_counters (
  day TEXT NOT NULL,
  kind TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind)
);
