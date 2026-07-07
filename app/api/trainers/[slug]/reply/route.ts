import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { isOwner } from "@/lib/claim";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const d = await db();
  const trainer = await d.get<{ id: number }>(
    "SELECT id FROM trainers WHERE slug = ?",
    [slug]
  );
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
  const reply = String(body.reply || "").trim().slice(0, 1000);
  // Ensure the recommendation belongs to this trainer.
  const rec = await d.get<{ id: number }>(
    "SELECT id FROM recommendations WHERE id = ? AND trainer_id = ?",
    [recId, trainer.id]
  );
  if (!rec)
    return NextResponse.json({ error: "Unknown recommendation" }, { status: 404 });

  if (reply.length === 0) {
    await d.run(
      "UPDATE recommendations SET reply = NULL, replied_at = NULL WHERE id = ?",
      [recId]
    );
  } else {
    await d.run(
      "UPDATE recommendations SET reply = ?, replied_at = datetime('now') WHERE id = ?",
      [reply, recId]
    );
  }
  return NextResponse.json({ ok: true });
}
