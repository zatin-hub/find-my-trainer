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
