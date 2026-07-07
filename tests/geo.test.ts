import { describe, it, expect } from "vitest";
import { distanceMeters } from "@/lib/geo";

describe("distanceMeters", () => {
  it("is zero for identical points", () => {
    expect(distanceMeters(12.97, 77.59, 12.97, 77.59)).toBe(0);
  });

  it("is symmetric", () => {
    const a = distanceMeters(12.97, 77.59, 12.93, 77.62);
    const b = distanceMeters(12.93, 77.62, 12.97, 77.59);
    expect(a).toBeCloseTo(b, 6);
  });

  it("one degree of latitude is ~111 km", () => {
    const d = distanceMeters(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });

  it("Indiranagar↔Koramangala is a few km", () => {
    const d = distanceMeters(12.9719, 77.6412, 12.9352, 77.6245);
    expect(d).toBeGreaterThan(3000);
    expect(d).toBeLessThan(6000);
  });
});
