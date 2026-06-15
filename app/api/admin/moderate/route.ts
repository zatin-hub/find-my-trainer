import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

type Action =
  | "approve_trainer"
  | "hide_trainer"
  | "approve_rec"
  | "hide_rec"
  | "resolve_report";

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
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
