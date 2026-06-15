export function formatPrice(
  min: number | null,
  max: number | null,
  unit: string | null
): string {
  if (!min && !max) return "Price not listed";
  const u = unit === "per_session" ? "/session" : "/month";
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  if (min && max && min !== max) return `${fmt(min)}–${fmt(max)}${u}`;
  return `${fmt(min || max!)}${u}`;
}

export function ratingStars(avg: number | null): string {
  if (!avg) return "";
  const full = Math.round(avg);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full)) + ` ${avg}`;
}
