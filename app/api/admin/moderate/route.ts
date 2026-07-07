import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";
import { isAdmin } from "@/lib/admin";
import { verifyInstagram } from "@/lib/instagram";
import {
  deleteRecommendationCascade,
  deleteTrainerCascade,
} from "@/lib/moderation";

type Action =
  | "approve_trainer"
  | "hide_trainer"
  | "approve_rec"
  | "hide_rec"
  | "resolve_report"
  | "merge_trainer"
  | "delete_trainer"
  | "delete_rec"
  | "set_verified"
  | "verify_instagram";

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

  const d = await db();

  const TARGET: Record<Action, string> = {
    approve_trainer: "trainer",
    hide_trainer: "trainer",
    delete_trainer: "trainer",
    merge_trainer: "trainer",
    set_verified: "trainer",
    verify_instagram: "trainer",
    approve_rec: "recommendation",
    hide_rec: "recommendation",
    delete_rec: "recommendation",
    resolve_report: "report",
  };
  const logAudit = (detail?: string) =>
    d.run(
      "INSERT INTO admin_audit (action, target_type, target_id, detail) VALUES (?, ?, ?, ?)",
      [action, TARGET[action] ?? "unknown", id, detail ?? null]
    );

  let auditDetail: string | undefined;
  switch (action) {
    case "approve_trainer":
      await d.run("UPDATE trainers SET status = 'approved' WHERE id = ?", [id]);
      break;
    case "hide_trainer":
      await d.run("UPDATE trainers SET status = 'rejected' WHERE id = ?", [id]);
      break;
    case "approve_rec":
      await d.run("UPDATE recommendations SET status = 'approved' WHERE id = ?", [id]);
      break;
    case "hide_rec":
      await d.run("UPDATE recommendations SET status = 'rejected' WHERE id = ?", [id]);
      break;
    case "resolve_report":
      await d.run("UPDATE reports SET status = 'resolved' WHERE id = ?", [id]);
      break;
    case "merge_trainer": {
      const into = Number(body.into_id);
      if (!Number.isInteger(into) || into === id)
        return NextResponse.json({ error: "Bad merge target" }, { status: 400 });
      const target = await d.get(
        "SELECT id FROM trainers WHERE id = ? AND status = 'approved'",
        [into]
      );
      if (!target)
        return NextResponse.json(
          { error: "Merge target not found" },
          { status: 404 }
        );
      // Run sequentially (D1 has no better-sqlite3-style sync transactions; an
      // admin-only action, so non-atomicity is an acceptable trade-off).
      await d.run("UPDATE recommendations SET trainer_id = ? WHERE trainer_id = ?", [into, id]);
      await d.run(
        `INSERT OR IGNORE INTO trainer_activities (trainer_id, activity_id)
         SELECT ?, activity_id FROM trainer_activities WHERE trainer_id = ?`,
        [into, id]
      );
      await d.run("DELETE FROM trainer_activities WHERE trainer_id = ?", [id]);
      await d.run("UPDATE OR IGNORE notifications SET trainer_id = ? WHERE trainer_id = ?", [into, id]);
      await d.run("DELETE FROM notifications WHERE trainer_id = ?", [id]);
      await d.run("UPDATE trainers SET status = 'merged', merged_into = ? WHERE id = ?", [into, id]);
      auditDetail = `merged into #${into}`;
      break;
    }
    case "delete_trainer":
      await deleteTrainerCascade(id);
      break;
    case "delete_rec":
      await deleteRecommendationCascade(id);
      break;
    case "set_verified": {
      const on = body.verified === true || body.verified === 1;
      await d.run(
        "UPDATE trainers SET verified = ?, verified_at = ? WHERE id = ?",
        [on ? 1 : 0, on ? new Date().toISOString() : null, id]
      );
      auditDetail = on ? "verified" : "unverified";
      break;
    }
    case "verify_instagram": {
      const t = await d.get<{ contact_instagram: string | null }>(
        "SELECT contact_instagram FROM trainers WHERE id = ?",
        [id]
      );
      if (!t?.contact_instagram)
        return NextResponse.json(
          { error: "No Instagram handle on file" },
          { status: 400 }
        );
      const result = await verifyInstagram(t.contact_instagram);
      await d.run(
        "UPDATE trainers SET ig_exists = ?, ig_followers = ?, ig_checked_at = ? WHERE id = ?",
        [
          result.checked ? (result.exists ? 1 : 0) : null,
          result.followers ?? null,
          new Date().toISOString(),
          id,
        ]
      );
      await logAudit(
        result.checked
          ? result.exists
            ? "ig exists"
            : "ig not found"
          : `ig inconclusive (${result.note ?? "blocked"})`
      );
      return NextResponse.json({ ok: true, result });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await logAudit(auditDetail);
  return NextResponse.json({ ok: true });
}
