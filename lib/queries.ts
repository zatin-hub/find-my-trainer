import { getDb } from "@/lib/db";
import type { Activity, Area, Recommendation, Trainer } from "@/lib/types";

export interface TrainerFilters {
  activity?: string; // activity slug
  area?: string; // area slug
  mode?: string;
  gender?: string;
  maxPrice?: number; // rupees, normalized to per_month-ish comparison via price_min
  minRating?: number;
  q?: string; // free text on name
}

export function getActivities(): Activity[] {
  return getDb()
    .prepare("SELECT id, slug, name, icon FROM activities ORDER BY id")
    .all() as Activity[];
}

export function getAreas(): Area[] {
  return getDb()
    .prepare("SELECT id, slug, name, lat, lng FROM areas ORDER BY name")
    .all() as Area[];
}

export interface SimilarTrainer {
  id: number;
  slug: string;
  name: string;
  area_name: string;
  score: number;
}

function normalizeTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Fuzzy-match existing trainers by name to avoid duplicate entries. */
export function findSimilarTrainers(
  name: string,
  areaSlug?: string
): SimilarTrainer[] {
  const tokens = normalizeTokens(name);
  if (tokens.length === 0) return [];
  const tokenSet = new Set(tokens);
  const norm = tokens.join(" ");

  const rows = getDb()
    .prepare(
      `SELECT t.id, t.slug, t.name, ar.name AS area_name, ar.slug AS area_slug
       FROM trainers t JOIN areas ar ON ar.id = t.area_id
       WHERE t.status = 'approved'`
    )
    .all() as {
    id: number;
    slug: string;
    name: string;
    area_name: string;
    area_slug: string;
  }[];

  const scored = rows
    .map((r) => {
      const rTokens = normalizeTokens(r.name);
      const rSet = new Set(rTokens);
      const inter = [...tokenSet].filter((t) => rSet.has(t)).length;
      const union = new Set([...tokenSet, ...rSet]).size;
      let score = union ? inter / union : 0; // Jaccard
      const rNorm = rTokens.join(" ");
      if (rNorm === norm) score = 1;
      else if (rNorm.includes(norm) || norm.includes(rNorm))
        score = Math.max(score, 0.7);
      if (areaSlug && r.area_slug === areaSlug) score += 0.1; // same-area boost
      return { id: r.id, slug: r.slug, name: r.name, area_name: r.area_name, score };
    })
    .filter((r) => r.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return scored;
}

/** Canonical slug if a trainer was merged into another. */
export function getMergedTargetSlug(slug: string): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT status, merged_into FROM trainers WHERE slug = ?")
    .get(slug) as { status: string; merged_into: number | null } | undefined;
  if (!row || row.status !== "merged" || !row.merged_into) return null;
  const target = db
    .prepare("SELECT slug FROM trainers WHERE id = ?")
    .get(row.merged_into) as { slug: string } | undefined;
  return target?.slug ?? null;
}

export function getActivityBySlug(slug: string): Activity | null {
  return (
    (getDb()
      .prepare("SELECT id, slug, name, icon FROM activities WHERE slug = ?")
      .get(slug) as Activity | undefined) ?? null
  );
}

export function getAreaBySlug(slug: string): Area | null {
  return (
    (getDb()
      .prepare("SELECT id, slug, name, lat, lng FROM areas WHERE slug = ?")
      .get(slug) as Area | undefined) ?? null
  );
}

interface TrainerRow {
  id: number;
  slug: string;
  name: string;
  gender: string | null;
  bio: string | null;
  area_id: number;
  area_name: string;
  lat: number;
  lng: number;
  modes: string;
  languages: string;
  contact_instagram: string | null;
  contact_phone: string | null;
  price_min: number | null;
  price_max: number | null;
  price_unit: string | null;
  status: string;
  claimed: number;
  verified: number;
  created_at: string;
  rec_count: number;
  avg_rating: number | null;
}

function safeJsonArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function rowToTrainer(row: TrainerRow): Trainer {
  const db = getDb();
  const acts = db
    .prepare(
      `SELECT a.id, a.slug, a.name, a.icon
       FROM trainer_activities ta JOIN activities a ON a.id = ta.activity_id
       WHERE ta.trainer_id = ? ORDER BY a.id`
    )
    .all(row.id) as Activity[];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    gender: row.gender,
    bio: row.bio,
    area_id: row.area_id,
    area_name: row.area_name,
    lat: row.lat,
    lng: row.lng,
    modes: safeJsonArray(row.modes) as Trainer["modes"],
    languages: safeJsonArray(row.languages),
    contact_instagram: row.contact_instagram,
    contact_phone: row.contact_phone,
    price_min: row.price_min,
    price_max: row.price_max,
    price_unit: row.price_unit as Trainer["price_unit"],
    status: row.status as Trainer["status"],
    claimed: !!row.claimed,
    verified: !!row.verified,
    activities: acts,
    rec_count: row.rec_count,
    avg_rating: row.avg_rating,
    created_at: row.created_at,
  };
}

export function listTrainers(filters: TrainerFilters = {}): Trainer[] {
  const db = getDb();
  const where: string[] = ["t.status = 'approved'"];
  const params: Record<string, unknown> = {};

  if (filters.area) {
    where.push("ar.slug = @area");
    params.area = filters.area;
  }
  if (filters.gender) {
    where.push("t.gender = @gender");
    params.gender = filters.gender;
  }
  if (filters.mode) {
    where.push("t.modes LIKE @mode");
    params.mode = `%"${filters.mode}"%`;
  }
  if (filters.q) {
    where.push("LOWER(t.name) LIKE @q");
    params.q = `%${filters.q.toLowerCase()}%`;
  }
  if (filters.maxPrice) {
    where.push("(t.price_min IS NULL OR t.price_min <= @maxPrice)");
    params.maxPrice = filters.maxPrice;
  }

  let activityJoin = "";
  if (filters.activity) {
    activityJoin = `JOIN trainer_activities fta ON fta.trainer_id = t.id
      JOIN activities fa ON fa.id = fta.activity_id AND fa.slug = @activity`;
    params.activity = filters.activity;
  }

  const having: string[] = [];
  if (filters.minRating) {
    having.push("avg_rating >= @minRating");
    params.minRating = filters.minRating;
  }

  const sql = `
    SELECT t.*, ar.name AS area_name,
      (SELECT COUNT(*) FROM recommendations r
         WHERE r.trainer_id = t.id AND r.status = 'approved') AS rec_count,
      (SELECT ROUND(AVG(r.rating), 1) FROM recommendations r
         WHERE r.trainer_id = t.id AND r.status = 'approved' AND r.rating IS NOT NULL) AS avg_rating
    FROM trainers t
    JOIN areas ar ON ar.id = t.area_id
    ${activityJoin}
    WHERE ${where.join(" AND ")}
    GROUP BY t.id
    ${having.length ? "HAVING " + having.join(" AND ") : ""}
    ORDER BY rec_count DESC, t.created_at DESC
  `;
  const rows = db.prepare(sql).all(params) as TrainerRow[];
  return rows.map(rowToTrainer);
}

export function getTrainerBySlug(slug: string): Trainer | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT t.*, ar.name AS area_name,
        (SELECT COUNT(*) FROM recommendations r
           WHERE r.trainer_id = t.id AND r.status = 'approved') AS rec_count,
        (SELECT ROUND(AVG(r.rating), 1) FROM recommendations r
           WHERE r.trainer_id = t.id AND r.status = 'approved' AND r.rating IS NOT NULL) AS avg_rating
       FROM trainers t JOIN areas ar ON ar.id = t.area_id
       WHERE t.slug = ?`
    )
    .get(slug) as TrainerRow | undefined;
  return row ? rowToTrainer(row) : null;
}

export function getRecommendations(trainerId: number): Recommendation[] {
  return getDb()
    .prepare(
      `SELECT r.*, a.name AS activity_name
       FROM recommendations r LEFT JOIN activities a ON a.id = r.activity_id
       WHERE r.trainer_id = ? AND r.status = 'approved'
       ORDER BY r.helpful_count DESC, r.created_at DESC`
    )
    .all(trainerId) as Recommendation[];
}

// ---- Admin / moderation queries ----

export interface AdminReport {
  id: number;
  target_type: string;
  target_id: number;
  reason: string | null;
  status: string;
  created_at: string;
  preview: string | null;
}

export function adminListReports(): AdminReport[] {
  const db = getDb();
  const reports = db
    .prepare("SELECT * FROM reports WHERE status = 'open' ORDER BY created_at DESC")
    .all() as AdminReport[];
  for (const r of reports) {
    if (r.target_type === "recommendation") {
      const rec = db
        .prepare("SELECT body FROM recommendations WHERE id = ?")
        .get(r.target_id) as { body: string } | undefined;
      r.preview = rec?.body ?? "(deleted)";
    } else if (r.target_type === "trainer") {
      const t = db
        .prepare("SELECT name FROM trainers WHERE id = ?")
        .get(r.target_id) as { name: string } | undefined;
      r.preview = t?.name ?? "(deleted)";
    }
  }
  return reports;
}

export interface AdminTrainerRow {
  id: number;
  slug: string;
  name: string;
  area_name: string;
  status: string;
  rec_count: number;
  created_at: string;
}

export function adminListTrainers(): AdminTrainerRow[] {
  return getDb()
    .prepare(
      `SELECT t.id, t.slug, t.name, ar.name AS area_name, t.status, t.created_at,
        (SELECT COUNT(*) FROM recommendations r WHERE r.trainer_id = t.id) AS rec_count
       FROM trainers t JOIN areas ar ON ar.id = t.area_id
       ORDER BY t.created_at DESC LIMIT 200`
    )
    .all() as AdminTrainerRow[];
}

export interface AdminRecRow {
  id: number;
  body: string;
  status: string;
  rating: number | null;
  trainer_name: string;
  trainer_slug: string;
  created_at: string;
}

export function adminListRecommendations(): AdminRecRow[] {
  return getDb()
    .prepare(
      `SELECT r.id, r.body, r.status, r.rating, r.created_at,
        t.name AS trainer_name, t.slug AS trainer_slug
       FROM recommendations r JOIN trainers t ON t.id = r.trainer_id
       ORDER BY r.created_at DESC LIMIT 200`
    )
    .all() as AdminRecRow[];
}

export interface AdminNotification {
  id: number;
  email: string;
  trainer_name: string;
  trainer_slug: string;
  sent: number;
  created_at: string;
}

export function adminListNotifications(): AdminNotification[] {
  return getDb()
    .prepare(
      `SELECT n.id, sp.email, t.name AS trainer_name, t.slug AS trainer_slug,
              n.sent, n.created_at
       FROM notifications n
       JOIN seeker_pins sp ON sp.id = n.seeker_pin_id
       JOIN trainers t ON t.id = n.trainer_id
       ORDER BY n.created_at DESC LIMIT 50`
    )
    .all() as AdminNotification[];
}

/** Which of the given recommendation ids has this anon visitor voted on. */
export function getVotedRecIds(
  anonId: string | undefined,
  recIds: number[]
): number[] {
  if (!anonId || recIds.length === 0) return [];
  const placeholders = recIds.map(() => "?").join(",");
  const rows = getDb()
    .prepare(
      `SELECT recommendation_id FROM rec_votes
       WHERE anon_id = ? AND recommendation_id IN (${placeholders})`
    )
    .all(anonId, ...recIds) as { recommendation_id: number }[];
  return rows.map((r) => r.recommendation_id);
}
