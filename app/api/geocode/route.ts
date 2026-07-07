import { NextRequest, NextResponse } from "next/server";
import { geocode, reverseGeocode } from "@/lib/geocode";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// GET /api/geocode?q=indiranagar          → forward search (both providers)
// GET /api/geocode?lat=12.97&lng=77.59     → reverse to a label
export async function GET(req: NextRequest) {
  const rl = await rateLimit(`geocode:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "Too many searches" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 30) } }
    );

  const sp = req.nextUrl.searchParams;
  const lat = sp.get("lat");
  const lng = sp.get("lng");
  if (lat && lng) {
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln))
      return NextResponse.json({ error: "Bad coordinates" }, { status: 400 });
    const label = await reverseGeocode(la, ln);
    return NextResponse.json({ label });
  }

  const q = sp.get("q") || "";
  const results = await geocode(q, sp.get("city") || undefined);
  return NextResponse.json({ results });
}
