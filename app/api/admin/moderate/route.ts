import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

type Action =
  | "approve_trainer"
  | "hide_trainer"
  | "approve_rec"
  | "hide_rec"
  | "resolve_report"
  | "merge_trainer";

export async function POST(req: NextRequest) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action as Action;
  const id = Number(body.id);
  if (!Number.isInteger(id))
    return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const db = getDb();
  switch (action) {
    case "approve_trainer":
      db.prepare("UPDATE trainers SET status = 'approved' WHERE id = ?").run(id);
      break;
    case "hide_trainer":
      db.prepare("UPDATE trainers SET status = 'rejected' WHERE id = ?").run(id);
      break;
    case "approve_rec":
      db.prepare("UPDATE recommendations SET status = 'approved' WHERE id = ?").run(id);
      break;
    case "hide_rec":
      db.prepare("UPDATE recommendations SET status = 'rejected' WHERE id = ?").run(id);
      break;
    case "resolve_report":
      db.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").run(id);
      break;
    case "merge_trainer": {
      const into = Number(body.into_id);
      if (!Number.isInteger(into) || into === id)
        return NextResponse.json({ error: "Bad merge target" }, { status: 400 });
      const target = db
        .prepare("SELECT id FROM trainers WHERE id = ? AND status = 'approved'")
        .get(into);
      if (!target)
        return NextResponse.json(
          { error: "Merge target not found" },
          { status: 404 }
        );
      const merge = db.transaction(() => {
        db.prepare(
          "UPDATE recommendations SET trainer_id = ? WHERE trainer_id = ?"
        ).run(into, id);
        db.prepare(
          `INSERT OR IGNORE INTO trainer_activities (trainer_id, activity_id)
           SELECT ?, activity_id FROM trainer_activities WHERE trainer_id = ?`
        ).run(into, id);
        db.prepare("DELETE FROM trainer_activities WHERE trainer_id = ?").run(id);
        db.prepare(
          "UPDATE OR IGNORE notifications SET trainer_id = ? WHERE trainer_id = ?"
        ).run(into, id);
        db.prepare("DELETE FROM notifications WHERE trainer_id = ?").run(id);
        db.prepare(
          "UPDATE trainers SET status = 'merged', merged_into = ? WHERE id = ?"
        ).run(into, id);
      });
      merge();
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
