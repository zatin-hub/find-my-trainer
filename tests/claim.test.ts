import { describe, it, expect } from "vitest";
import { hashOtp, newClaimToken, claimCookieName } from "@/lib/claim";

describe("hashOtp", () => {
  it("is deterministic", () => {
    expect(hashOtp("123456")).toBe(hashOtp("123456"));
  });
  it("differs for different inputs", () => {
    expect(hashOtp("123456")).not.toBe(hashOtp("654321"));
  });
  it("is a 64-char sha256 hex string", () => {
    expect(hashOtp("123456")).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("newClaimToken", () => {
  it("is 48 hex chars (24 bytes) and unique", () => {
    const a = newClaimToken();
    const b = newClaimToken();
    expect(a).toMatch(/^[a-f0-9]{48}$/);
    expect(a).not.toBe(b);
  });
});

describe("claimCookieName", () => {
  it("namespaces by trainer id", () => {
    expect(claimCookieName(7)).toBe("claim_7");
  });
});
