import { describe, it, expect } from "vitest";
import { assessFake, type FakeSignals } from "@/lib/fakescore";

const base: FakeSignals = {
  recCount: 3,
  selfRecCount: 0,
  siblingCount: 1,
  bio: "Certified strength coach with 8 years of experience in Bengaluru.",
  instagram: "arjun.fit",
  priceMin: 2000,
  verified: false,
  claimed: false,
  ageMinutes: 5000,
};

describe("assessFake", () => {
  it("rates a well-formed, vouched entry low", () => {
    const a = assessFake(base);
    expect(a.level).toBe("low");
    expect(a.score).toBeLessThan(25);
  });

  it("flags an entry with no recommendations", () => {
    const a = assessFake({ ...base, recCount: 0 });
    expect(a.reasons).toContain("No recommendations");
    expect(a.score).toBeGreaterThanOrEqual(25);
  });

  it("flags self-vouching (only the creator recommended it)", () => {
    const a = assessFake({ ...base, recCount: 1, selfRecCount: 1 });
    expect(a.reasons).toContain("Only recommended by its own creator");
  });

  it("flags bulk creation by one anon", () => {
    const a = assessFake({ ...base, siblingCount: 6 });
    expect(a.reasons.some((r) => r.includes("bulk"))).toBe(true);
  });

  it("flags invalid instagram and spammy bio", () => {
    const a = assessFake({
      ...base,
      instagram: "not a handle!!",
      bio: "best coach visit www.spam.xyz call 9988776655",
    });
    expect(a.reasons).toContain("Missing/invalid Instagram handle");
    expect(a.reasons).toContain("Bio contains a link");
    expect(a.level).toBe("high");
  });

  it("caps the score for admin-verified entries", () => {
    const bad: FakeSignals = {
      ...base,
      recCount: 0,
      instagram: null,
      bio: "",
      verified: true,
    };
    const a = assessFake(bad);
    expect(a.score).toBeLessThanOrEqual(15);
    expect(a.level).toBe("low");
    expect(a.reasons).toContain("Admin-verified");
  });

  it("never exceeds 100", () => {
    const worst: FakeSignals = {
      recCount: 0,
      selfRecCount: 0,
      siblingCount: 9,
      bio: "http://x.com 99999999999",
      instagram: null,
      priceMin: 999999,
      verified: false,
      claimed: false,
      ageMinutes: 1,
    };
    expect(assessFake(worst).score).toBeLessThanOrEqual(100);
  });
});
