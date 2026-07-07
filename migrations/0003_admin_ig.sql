-- Admin verification + Instagram check columns.
-- `verified` already exists from 0001_init; these add the audit trail and the
-- (optional, pluggable) Instagram check results.
ALTER TABLE trainers ADD COLUMN verified_at TEXT;
ALTER TABLE trainers ADD COLUMN ig_exists INTEGER;
ALTER TABLE trainers ADD COLUMN ig_followers INTEGER;
ALTER TABLE trainers ADD COLUMN ig_checked_at TEXT;
