import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAnonId, setAnonCookie } from "@/lib/anon";

const VALID_TARGETS = new Set(["trainer", "recommendation"]);

export async function POST(req: NextRequest) {
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
  getDb()
    .prepare(
      "INSERT INTO reports (target_type, target_id, reason, anon_id) VALUES (?,?,?,?)"
    )
    .run(targetType, targetId, body.reason ? String(body.reason) : null, anonId);

  return setAnonCookie(NextResponse.json({ ok: true }), anonId);
}
