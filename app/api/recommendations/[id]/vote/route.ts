import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { getAnonId, setAnonCookie } from "@/lib/anon";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { applyVote, hashIp } from "@/lib/votes";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await rateLimit(`vote:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok)
    return NextResponse.json({ error: "Too many votes" }, { status: 429 });

  const { id } = await params;
  const recId = Number(id);
  if (!Number.isInteger(recId))
    return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const rec = await (await db()).get("SELECT id FROM recommendations WHERE id = ?", [
    recId,
  ]);
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const anonId = await getAnonId();
  const { voted, count } = await applyVote(recId, anonId, hashIp(clientIp(req)));

  return setAnonCookie(NextResponse.json({ ok: true, voted, count }), anonId);
}
