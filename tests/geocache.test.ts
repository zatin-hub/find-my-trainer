import { describe, it, expect, vi, afterEach } from "vitest";
import { cacheGet, cacheSet, forwardKey, reverseKey } from "@/lib/geocache";

afterEach(() => vi.useRealTimers());

describe("geocache keys", () => {
  it("normalizes forward keys (case, whitespace, city)", () => {
    expect(forwardKey("  Koramangala   5th Block ", "bengaluru")).toBe(
      "f:bengaluru:koramangala 5th block"
    );
    expect(forwardKey("x", undefined)).toBe("f:any:x");
  });

  it("rounds reverse keys to ~11 m so nearby points share entries", () => {
    expect(reverseKey(12.97161, 77.59459)).toBe(reverseKey(12.97158, 77.59463));
    expect(reverseKey(12.9716, 77.5946)).not.toBe(reverseKey(12.98, 77.5946));
  });
});

describe("geocache store (memory path)", () => {
  it("round-trips values", async () => {
    await cacheSet("t:roundtrip", "hello");
    expect(await cacheGet("t:roundtrip")).toBe("hello");
  });

  it("misses on unknown keys", async () => {
    expect(await cacheGet("t:never-set")).toBeNull();
  });

  it("expires entries after the TTL", async () => {
    vi.useFakeTimers();
    await cacheSet("t:expiry", "stale");
    vi.setSystemTime(Date.now() + 31 * 24 * 60 * 60 * 1000); // 31 days
    expect(await cacheGet("t:expiry")).toBeNull();
  });
});
