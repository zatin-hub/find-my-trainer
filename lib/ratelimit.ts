import { NextRequest } from "next/server";

// Simple in-memory sliding-window limiter. Fine for a single-instance MVP;
// swap for Redis/Upstash in production (see PLAN.md §7).
const hits = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  retryAfter?: number;
}

export function rateLimit(
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

export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

/** Periodic cleanup so the map doesn't grow unbounded. */
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
