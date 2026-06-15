import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isOwner } from "@/lib/claim";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDb();
  const trainer = db
    .prepare("SELECT id FROM trainers WHERE slug = ?")
    .get(slug) as { id: number } | undefined;
  if (!trainer)
    return NextResponse.json({ error: "Unknown trainer" }, { status: 404 });

  if (!(await isOwner(trainer.id)))
    return NextResponse.json({ error: "Not the owner" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const recId = Number(body.recommendation_id);
  const reply = String(body.reply || "").trim();
  // Ensure the recommendation belongs to this trainer.
  const rec = db
    .prepare("SELECT id FROM recommendations WHERE id = ? AND trainer_id = ?")
    .get(recId, trainer.id) as { id: number } | undefined;
  if (!rec)
    return NextResponse.json({ error: "Unknown recommendation" }, { status: 404 });

  if (reply.length === 0) {
    db.prepare(
      "UPDATE recommendations SET reply = NULL, replied_at = NULL WHERE id = ?"
    ).run(recId);
  } else {
    db.prepare(
      "UPDATE recommendations SET reply = ?, replied_at = datetime('now') WHERE id = ?"
    ).run(reply, recId);
  }
  return NextResponse.json({ ok: true });
}
