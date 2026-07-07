import { inWorkers } from "@/lib/runtime";

// 30-day cache for geocode results — KV on Workers, in-memory locally.
// Geocoding inputs repeat heavily ("koramangala", the same dragged pin), and
// upstream providers are rate-limited (Nominatim ~1 req/s), so a long-TTL
// cache is both a cost and a reliability win.

const TTL_SECONDS = 30 * 24 * 60 * 60;

interface KvLike {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    opts?: { expirationTtl?: number }
  ): Promise<void>;
}

let kvPromise: Promise<KvLike | null> | null = null;
function getKv(): Promise<KvLike | null> {
  if (!kvPromise) {
    kvPromise = (async () => {
      if (!inWorkers()) return null;
      try {
        const mod = await import("@opennextjs/cloudflare");
        const ctx = await mod.getCloudflareContext({ async: true });
        const env = (ctx as unknown as { env?: Record<string, unknown> })?.env;
        // Reuse the RATE_LIMIT namespace with a distinct prefix — avoids a new
        // binding; geocode entries are tiny and TTL-bounded.
        return (env?.RATE_LIMIT as KvLike) ?? null;
      } catch {
        return null;
      }
    })();
  }
  return kvPromise;
}

// Local fallback: simple TTL map (fine for dev/tests; prod uses KV).
const memory = new Map<string, { value: string; expires: number }>();

export async function cacheGet(key: string): Promise<string | null> {
  const kv = await getKv();
  if (kv) return kv.get(`geo:${key}`);
  const hit = memory.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

export async function cacheSet(key: string, value: string): Promise<void> {
  const kv = await getKv();
  if (kv) {
    await kv.put(`geo:${key}`, value, { expirationTtl: TTL_SECONDS });
    return;
  }
  memory.set(key, { value, expires: Date.now() + TTL_SECONDS * 1000 });
}

/** Normalize a forward-search query into a stable cache key. */
export function forwardKey(q: string, city: string | undefined): string {
  return `f:${city ?? "any"}:${q.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

/** Round coordinates to ~11 m so nearby drag-ends share a cache entry. */
export function reverseKey(lat: number, lng: number): string {
  return `r:${lat.toFixed(4)},${lng.toFixed(4)}`;
}
