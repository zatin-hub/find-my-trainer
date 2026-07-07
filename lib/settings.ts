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

export async function setSetting(key: string, value: string): Promise<void> {
  await (await db()).run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, value]
  );
}
