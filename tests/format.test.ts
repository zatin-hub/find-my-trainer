import { describe, it, expect } from "vitest";
import { formatPrice, formatDistance, ratingStars } from "@/lib/format";

describe("formatPrice", () => {
  it("handles no price", () => {
    expect(formatPrice(null, null, null)).toBe("Price not listed");
  });
  it("formats a range per month", () => {
    expect(formatPrice(8000, 12000, "per_month")).toBe("₹8,000–₹12,000/month");
  });
  it("formats a single value per session", () => {
    expect(formatPrice(600, null, "per_session")).toBe("₹600/session");
  });
  it("collapses equal min/max", () => {
    expect(formatPrice(5000, 5000, "per_month")).toBe("₹5,000/month");
  });
});

describe("formatDistance", () => {
  it("uses metres under ~1 km", () => {
    expect(formatDistance(300)).toBe("300 m");
  });
  it("uses km at/over ~1 km", () => {
    expect(formatDistance(1500)).toBe("1.5 km");
  });
  it("rounds km to one decimal", () => {
    expect(formatDistance(2340)).toBe("2.3 km");
  });
});

describe("ratingStars", () => {
  it("is empty for null", () => {
    expect(ratingStars(null)).toBe("");
  });
  it("renders five filled stars for 5", () => {
    expect(ratingStars(5)).toBe("★★★★★ 5");
  });
  it("rounds and always shows five glyphs", () => {
    expect(ratingStars(4)).toBe("★★★★☆ 4");
    expect(ratingStars(4.5)).toBe("★★★★★ 4.5");
  });
});
