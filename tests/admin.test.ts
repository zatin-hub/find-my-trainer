import { describe, it, expect } from "vitest";
import { adminToken, checkAdminKey, ADMIN_COOKIE, ADMIN_KEY } from "@/lib/admin";

// In tests NODE_ENV is "test" (not production) and ADMIN_KEY defaults to "letmein".
describe("admin auth", () => {
  it("accepts the correct key", () => {
    expect(checkAdminKey(ADMIN_KEY)).toBe(true);
  });
  it("rejects a wrong key", () => {
    expect(checkAdminKey("not-the-key")).toBe(false);
    expect(checkAdminKey("")).toBe(false);
  });
  it("derives a stable sha256 session token (never the raw key)", () => {
    expect(adminToken()).toMatch(/^[a-f0-9]{64}$/);
    expect(adminToken()).not.toContain(ADMIN_KEY);
    expect(adminToken()).toBe(adminToken());
  });
  it("uses a session cookie name", () => {
    expect(ADMIN_COOKIE).toBe("admin_session");
  });
});
