// Heuristic "is this a fake/low-trust entry?" scorer. Pure + deterministic so
// it's unit-testable and cheap to run for every row in the admin panel. The
// caller assembles FakeSignals from the DB; this file holds only the scoring.

export interface FakeSignals {
  recCount: number; // approved + pending recommendations
  selfRecCount: number; // recs whose anon_id == the trainer's creator
  siblingCount: number; // how many trainers the same anon created (incl. this)
  bio: string | null;
  instagram: string | null;
  priceMin: number | null;
  verified: boolean; // admin has eyeballed it
  claimed: boolean; // owner claimed via OTP
  ageMinutes: number; // minutes since created_at
}

export type FakeLevel = "low" | "medium" | "high";

export interface FakeAssessment {
  score: number; // 0–100, higher = more suspicious
  level: FakeLevel;
  reasons: string[];
}

const IG_HANDLE = /^[a-zA-Z0-9._]{1,30}$/;
const URL_IN_TEXT = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|in|co|io|xyz)\b/i;
const LONG_DIGIT_RUN = /\d{7,}/; // phone numbers / spam dumped in free text

// A verified or owner-claimed entry can't score high — those are strong
// positive trust signals that should dominate the heuristics.
const TRUSTED_CAP = 15;

export function assessFake(s: FakeSignals): FakeAssessment {
  const reasons: string[] = [];
  let score = 0;

  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };

  if (s.recCount === 0) add(25, "No recommendations");

  // The only voucher is the person who added the trainer → self-vouching.
  if (s.recCount > 0 && s.selfRecCount >= s.recCount)
    add(30, "Only recommended by its own creator");

  if (s.siblingCount >= 5)
    add(25, `Creator added ${s.siblingCount} trainers (bulk)`);
  else if (s.siblingCount >= 3)
    add(12, `Creator added ${s.siblingCount} trainers`);

  // Instagram is the product's primary trust signal — weight it heavily.
  if (!s.instagram || !IG_HANDLE.test(s.instagram))
    add(25, "Missing/invalid Instagram handle");

  const bio = (s.bio ?? "").trim();
  if (bio.length === 0) add(8, "Empty bio");
  else if (bio.length < 20) add(5, "Very short bio");
  if (URL_IN_TEXT.test(bio)) add(15, "Bio contains a link");
  if (LONG_DIGIT_RUN.test(bio)) add(10, "Bio contains a phone/number dump");

  if (s.priceMin != null && (s.priceMin <= 0 || s.priceMin > 100_000))
    add(10, "Implausible price");

  // Brand-new and otherwise unvouched: mild bump (decays as recs arrive).
  if (s.ageMinutes < 60 && s.recCount === 0) add(8, "Created in the last hour");

  if (s.verified || s.claimed) {
    score = Math.min(score, TRUSTED_CAP);
    reasons.push(s.verified ? "Admin-verified" : "Owner-claimed");
  }

  score = Math.max(0, Math.min(100, score));
  const level: FakeLevel = score >= 50 ? "high" : score >= 25 ? "medium" : "low";
  return { score, level, reasons };
}
