import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { getAnonId, setAnonCookie } from "@/lib/anon";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const VALID_TARGETS = new Set(["trainer", "recommendation"]);

export async function POST(req: NextRequest) {
  const rl = await rateLimit(`reports:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "Too many reports. Please slow down." },
      { status: 429 }
    );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetType = String(body.target_type || "");
  const targetId = Number(body.target_id);
  if (!VALID_TARGETS.has(targetType) || !Number.isInteger(targetId))
    return NextResponse.json({ error: "Bad target" }, { status: 400 });

  const anonId = await getAnonId();
  await (await db()).run(
    "INSERT INTO reports (target_type, target_id, reason, anon_id) VALUES (?,?,?,?)",
    [
      targetType,
      targetId,
      body.reason ? String(body.reason).slice(0, 500) : null,
      anonId,
    ]
  );

  return setAnonCookie(NextResponse.json({ ok: true }), anonId);
}
