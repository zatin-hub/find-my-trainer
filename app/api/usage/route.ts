import { NextRequest, NextResponse } from "next/server";
import { bumpUsage } from "@/lib/usage";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// Client-side usage beacon (tile request batches from olaTransform). Analytics
// only: strict allowlist + capped increments + rate limit keep junk bounded.
const CLIENT_KINDS = new Set(["ola_tile"]);
const MAX_N = 500;

export async function POST(req: NextRequest) {
  const rl = await rateLimit(`usage:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: true }); // drop silently

  let body: { kind?: string; n?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const kind = String(body.kind || "");
  const n = Math.min(Math.max(1, Math.floor(Number(body.n) || 1)), MAX_N);
  if (!CLIENT_KINDS.has(kind))
    return NextResponse.json({ error: "Bad kind" }, { status: 400 });

  await bumpUsage(kind as "ola_tile", n);
  return NextResponse.json({ ok: true });
}
