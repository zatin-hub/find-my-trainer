import { db } from "@/lib/database";

// Destructive admin actions, extracted from the moderate route so they can be
// unit-tested directly. Children are deleted explicitly (not via FK cascade)
// so the behaviour is identical on better-sqlite3 and D1.

/** Hard-delete a trainer and every row that references it. */
export async function deleteTrainerCascade(id: number): Promise<void> {
  const d = await db();
  await d.run(
    `DELETE FROM rec_votes WHERE recommendation_id IN
       (SELECT id FROM recommendations WHERE trainer_id = ?)`,
    [id]
  );
  await d.run("DELETE FROM recommendations WHERE trainer_id = ?", [id]);
  await d.run("DELETE FROM trainer_activities WHERE trainer_id = ?", [id]);
  await d.run("DELETE FROM notifications WHERE trainer_id = ?", [id]);
  await d.run("DELETE FROM claims WHERE trainer_id = ?", [id]);
  await d.run(
    "DELETE FROM reports WHERE target_type = 'trainer' AND target_id = ?",
    [id]
  );
  await d.run("DELETE FROM trainers WHERE id = ?", [id]);
}

/** Hard-delete a recommendation and every row that references it. */
export async function deleteRecommendationCascade(id: number): Promise<void> {
  const d = await db();
  await d.run("DELETE FROM rec_votes WHERE recommendation_id = ?", [id]);
  await d.run(
    "DELETE FROM reports WHERE target_type = 'recommendation' AND target_id = ?",
    [id]
  );
  await d.run("DELETE FROM recommendations WHERE id = ?", [id]);
}
