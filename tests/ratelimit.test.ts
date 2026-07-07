import { describe, it, expect } from "vitest";
import type { NextRequest } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

function fakeReq(headers: Record<string, string>): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

describe("rateLimit (in-memory, local)", () => {
  it("allows up to the limit then blocks", async () => {
    const key = "test:" + Math.random();
    expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
    expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
    expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
    const blocked = await rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("treats keys independently", async () => {
    const a = "a:" + Math.random();
    const b = "b:" + Math.random();
    await rateLimit(a, 1, 60_000);
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(false);
    expect((await rateLimit(b, 1, 60_000)).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first X-Forwarded-For entry", () => {
    expect(clientIp(fakeReq({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe(
      "1.2.3.4"
    );
  });
  it("prefers cf-connecting-ip over spoofable x-forwarded-for", () => {
    expect(
      clientIp(
        fakeReq({ "cf-connecting-ip": "8.8.8.8", "x-forwarded-for": "1.1.1.1" })
      )
    ).toBe("8.8.8.8");
  });
  it("falls back to x-real-ip", () => {
    expect(clientIp(fakeReq({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });
  it("falls back to 'local' when no headers", () => {
    expect(clientIp(fakeReq({}))).toBe("local");
  });
});
