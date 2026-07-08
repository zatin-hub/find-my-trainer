import { db } from "@/lib/database";

// Tiny key/value store for admin-tunable runtime settings (map provider etc.).
// Reads are per-request; no caching layer so an admin toggle applies on the
// next page load.

export async function getSetting(key: string): Promise<string | null> {
  const row = await (await db()).get<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return row?.value ?? null;
}

/** Batch read — one query however many keys (D1 is metered). */
export async function getSettings(
  keys: string[]
): Promise<Record<string, string | null>> {
  if (keys.length === 0) return {};
  const rows = await (await db()).all<{ key: string; value: string }>(
    `SELECT key, value FROM settings WHERE key IN (${keys.map(() => "?").join(",")})`,
    keys
  );
  const out: Record<string, string | null> = {};
  for (const k of keys) out[k] = null;
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await (await db()).run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, value]
  );
}
