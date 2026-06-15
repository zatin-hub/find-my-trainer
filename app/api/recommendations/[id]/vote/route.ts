import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAnonId, setAnonCookie } from "@/lib/anon";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recId = Number(id);
  if (!Number.isInteger(recId))
    return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const db = getDb();
  const rec = db
    .prepare("SELECT id FROM recommendations WHERE id = ?")
    .get(recId);
  if (!rec)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const anonId = await getAnonId();

  // One vote per anonymous visitor; toggle off if they vote again.
  const existing = db
    .prepare("SELECT 1 FROM rec_votes WHERE recommendation_id = ? AND anon_id = ?")
    .get(recId, anonId);

  let voted: boolean;
  if (existing) {
    db.prepare(
      "DELETE FROM rec_votes WHERE recommendation_id = ? AND anon_id = ?"
    ).run(recId, anonId);
    voted = false;
  } else {
    db.prepare(
      "INSERT OR IGNORE INTO rec_votes (recommendation_id, anon_id) VALUES (?, ?)"
    ).run(recId, anonId);
    voted = true;
  }

  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM rec_votes WHERE recommendation_id = ?")
    .get(recId) as { count: number };
  db.prepare("UPDATE recommendations SET helpful_count = ? WHERE id = ?").run(
    count,
    recId
  );

  return setAnonCookie(
    NextResponse.json({ ok: true, voted, count }),
    anonId
  );
}
