import crypto from "node:crypto";
import { db } from "@/lib/database";

// Hash the IP so we never store raw addresses (privacy) while still being able
// to dedup votes per network.
export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

/**
 * Toggle a "helpful" vote on a recommendation.
 *
 * - Each visitor (anon_id) may toggle their own vote freely — so a person can
 *   vote across many trainers/recommendations.
 * - A given IP can only add one vote per recommendation: this stops vote
 *   stuffing by dropping the cookie to mint fresh anon ids. Trade-off: large
 *   shared networks (CGNAT) are slightly undercounted.
 */
export async function applyVote(
  recId: number,
  anonId: string,
  ipHash: string
): Promise<{ voted: boolean; count: number }> {
  const d = await db();

  const mine = await d.get(
    "SELECT 1 FROM rec_votes WHERE recommendation_id = ? AND anon_id = ?",
    [recId, anonId]
  );

  let voted: boolean;
  if (mine) {
    // Toggle off this visitor's own vote.
    await d.run(
      "DELETE FROM rec_votes WHERE recommendation_id = ? AND anon_id = ?",
      [recId, anonId]
    );
    voted = false;
  } else {
    // INSERT OR IGNORE leans on the (recommendation_id, ip_hash) unique index to
    // reject a second vote from the same network — no separate ipVoted lookup
    // needed. changes > 0 means the row was actually added (i.e. now voted).
    const info = await d.run(
      "INSERT OR IGNORE INTO rec_votes (recommendation_id, anon_id, ip_hash) VALUES (?, ?, ?)",
      [recId, anonId, ipHash]
    );
    voted = info.changes > 0;
  }

  const row = await d.get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM rec_votes WHERE recommendation_id = ?",
    [recId]
  );
  const count = row?.count ?? 0;
  await d.run("UPDATE recommendations SET helpful_count = ? WHERE id = ?", [
    count,
    recId,
  ]);

  return { voted, count };
}
