import { db } from "@/lib/database";

// Self-measured provider usage (Ola has no programmatic usage API — console
// only). Server-side calls bump directly; client tile traffic reports in
// batches via POST /api/usage. Day buckets are UTC.

export type UsageKind =
  | "ola_tile" // client: tile/glyph/sprite requests to api.olamaps.io
  | "geocode_fwd_ola"
  | "geocode_fwd_photon"
  | "geocode_fwd_nominatim"
  | "geocode_fwd_cache"
  | "geocode_rev_live"
  | "geocode_rev_cache";

export const USAGE_KINDS: UsageKind[] = [
  "ola_tile",
  "geocode_fwd_ola",
  "geocode_fwd_photon",
  "geocode_fwd_nominatim",
  "geocode_fwd_cache",
  "geocode_rev_live",
  "geocode_rev_cache",
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Fire-and-forget increment — must never break the calling hot path. */
export async function bumpUsage(kind: UsageKind, n = 1): Promise<void> {
  try {
    await (await db()).run(
      `INSERT INTO usage_counters (day, kind, count) VALUES (?, ?, ?)
       ON CONFLICT(day, kind) DO UPDATE SET count = count + excluded.count`,
      [today(), kind, n]
    );
  } catch {
    /* analytics only — swallow */
  }
}

export interface UsageDay {
  day: string;
  counts: Record<string, number>;
}

/** Last `days` days of counters, newest first (missing kinds = 0). */
export async function getUsage(days = 7): Promise<UsageDay[]> {
  const rows = await (await db()).all<{
    day: string;
    kind: string;
    count: number;
  }>(
    `SELECT day, kind, count FROM usage_counters
     WHERE day >= date('now', ?) ORDER BY day DESC`,
    [`-${days} days`]
  );
  const byDay = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const rec = byDay.get(r.day) ?? {};
    rec[r.kind] = r.count;
    byDay.set(r.day, rec);
  }
  return [...byDay.entries()].map(([day, counts]) => ({ day, counts }));
}
