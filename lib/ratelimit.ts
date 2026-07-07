import { NextRequest } from "next/server";
import { inWorkers } from "@/lib/runtime";

export interface RateLimitResult {
  ok: boolean;
  retryAfter?: number;
}

// ---- In-memory limiter (local dev / single instance) -----------------------
// A sliding window. Fine locally; on Cloudflare a Worker isolate doesn't share
// memory, so production uses the KV-backed path below.
const hits = new Map<string, number[]>();

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - arr[0])) / 1000);
    hits.set(key, arr);
    return { ok: false, retryAfter };
  }
  arr.push(now);
  hits.set(key, arr);
  return { ok: true };
}

// ---- KV limiter (Cloudflare) ----------------------------------------------
// Fixed-window counter. Not perfectly atomic (KV isn't), but good enough as an
// abuse throttle; precise limiting would need Durable Objects.
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
      if (!inWorkers()) return null; // local dev → in-memory limiter
      try {
        const mod = await import("@opennextjs/cloudflare");
        const ctx = await mod.getCloudflareContext({ async: true });
        const env = (ctx as unknown as { env?: Record<string, unknown> })?.env;
        return (env?.RATE_LIMIT as KvLike) ?? null;
      } catch {
        return null;
      }
    })();
  }
  return kvPromise;
}

async function kvLimit(
  kv: KvLike,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const ttl = Math.max(60, Math.ceil(windowMs / 1000)); // KV min TTL is 60s
  const bucket = Math.floor(Date.now() / windowMs);
  const k = `rl:${key}:${bucket}`;
  const cur = Number((await kv.get(k)) ?? 0);
  if (cur >= limit) {
    const retryAfter = Math.ceil(
      (windowMs - (Date.now() % windowMs)) / 1000
    );
    return { ok: false, retryAfter };
  }
  await kv.put(k, String(cur + 1), { expirationTtl: ttl });
  return { ok: true };
}

/** Throttle by key. Uses KV on Cloudflare, in-memory locally. */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const kv = await getKv();
  return kv ? kvLimit(kv, key, limit, windowMs) : memoryLimit(key, limit, windowMs);
}

export function clientIp(req: NextRequest): string {
  // Prefer headers set by a trusted proxy/CDN (Cloudflare, platform) over the
  // client-controllable X-Forwarded-For, which can be spoofed to dodge limits.
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "local";
}

/** Periodic cleanup of the in-memory map (local only). */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, arr] of hits) {
      const kept = arr.filter((t) => now - t < 60 * 60 * 1000);
      if (kept.length === 0) hits.delete(k);
      else hits.set(k, kept);
    }
  }, 10 * 60 * 1000).unref?.();
}
