-- User-proposed activity that isn't in the fixed taxonomy yet. Surfaced in the
-- admin panel so it can be promoted to a real activity later.
ALTER TABLE trainers ADD COLUMN custom_activity TEXT;
