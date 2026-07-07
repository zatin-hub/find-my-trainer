import { db } from "@/lib/database";
import type { Activity, Area, Recommendation, Trainer } from "@/lib/types";
import { assessFake, type FakeLevel } from "@/lib/fakescore";

// Categorical filters accept a single slug or a list (multi-select). Within a
// category the values are OR-ed; across categories they are AND-ed.
export interface TrainerFilters {
  city?: string; // city slug — restricts to areas in that city
  activity?: string | string[]; // activity slug(s)
  area?: string | string[]; // area slug(s)
  mode?: string | string[];
  gender?: string | string[];
  maxPrice?: number; // rupees, normalized to per_month-ish comparison via price_min
  minRating?: number;
  q?: string; // free text on name
}

// Normalize a single-or-array filter value into a clean string[] (drops empties).
function toList(v: string | string[] | undefined): string[] {
  if (v == null) return [];
  return (Array.isArray(v) ? v : [v]).map((s) => s.trim()).filter(Boolean);
}

export async function getActivities(): Promise<Activity[]> {
  return (await db()).all<Activity>(
    "SELECT id, slug, name, icon FROM activities ORDER BY id"
  );
}

export async function getAreas(): Promise<Area[]> {
  return (await db()).all<Area>(
    "SELECT id, slug, name, lat, lng, city FROM areas ORDER BY city, name"
  );
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
export async function findSimilarTrainers(
  name: string,
  areaSlug?: string
): Promise<SimilarTrainer[]> {
  const tokens = normalizeTokens(name);
  if (tokens.length === 0) return [];
  const tokenSet = new Set(tokens);
  const norm = tokens.join(" ");

  const rows = await (await db()).all<{
    id: number;
    slug: string;
    name: string;
    area_name: string;
    area_slug: string;
  }>(
    `SELECT t.id, t.slug, t.name, ar.name AS area_name, ar.slug AS area_slug
     FROM trainers t JOIN areas ar ON ar.id = t.area_id
     WHERE t.status = 'approved'`
  );

  return rows
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
}

/** Canonical slug if a trainer was merged into another. */
export async function getMergedTargetSlug(slug: string): Promise<string | null> {
  const d = await db();
  const row = await d.get<{ status: string; merged_into: number | null }>(
    "SELECT status, merged_into FROM trainers WHERE slug = ?",
    [slug]
  );
  if (!row || row.status !== "merged" || !row.merged_into) return null;
  const target = await d.get<{ slug: string }>(
    "SELECT slug FROM trainers WHERE id = ?",
    [row.merged_into]
  );
  return target?.slug ?? null;
}

export async function getActivityBySlug(slug: string): Promise<Activity | null> {
  return (
    (await (await db()).get<Activity>(
      "SELECT id, slug, name, icon FROM activities WHERE slug = ?",
      [slug]
    )) ?? null
  );
}

export async function getAreaBySlug(slug: string): Promise<Area | null> {
  return (
    (await (await db()).get<Area>(
      "SELECT id, slug, name, lat, lng, city FROM areas WHERE slug = ?",
      [slug]
    )) ?? null
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

// Fetch activities for many trainers in ONE query (avoids an N+1 per-trainer
// lookup — important for D1, where each row read is metered).
async function activitiesByTrainer(
  ids: number[]
): Promise<Map<number, Activity[]>> {
  const map = new Map<number, Activity[]>();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => "?").join(",");
  const rows = await (await db()).all<Activity & { tid: number }>(
    `SELECT ta.trainer_id AS tid, a.id, a.slug, a.name, a.icon
     FROM trainer_activities ta JOIN activities a ON a.id = ta.activity_id
     WHERE ta.trainer_id IN (${placeholders}) ORDER BY a.id`,
    ids
  );
  for (const r of rows) {
    const list = map.get(r.tid) ?? [];
    list.push({ id: r.id, slug: r.slug, name: r.name, icon: r.icon });
    map.set(r.tid, list);
  }
  return map;
}

function rowToTrainer(row: TrainerRow, activities: Activity[]): Trainer {
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
    activities,
    rec_count: row.rec_count,
    avg_rating: row.avg_rating,
    created_at: row.created_at,
  };
}

export async function listTrainers(
  filters: TrainerFilters = {}
): Promise<Trainer[]> {
  const where: string[] = ["t.status = 'approved'"];
  const params: Record<string, unknown> = {};

  const areas = toList(filters.area);
  const genders = toList(filters.gender);
  const modes = toList(filters.mode);
  const activities = toList(filters.activity);

  if (filters.city) {
    where.push("ar.city = @city");
    params.city = filters.city;
  }
  if (areas.length) {
    const keys = areas.map((_, i) => `@area${i}`);
    where.push(`ar.slug IN (${keys.join(",")})`);
    areas.forEach((v, i) => (params[`area${i}`] = v));
  }
  if (genders.length) {
    const keys = genders.map((_, i) => `@gender${i}`);
    where.push(`t.gender IN (${keys.join(",")})`);
    genders.forEach((v, i) => (params[`gender${i}`] = v));
  }
  if (modes.length) {
    // modes is stored as a JSON array string; match any selected mode.
    const ors = modes.map((_, i) => `t.modes LIKE @mode${i}`);
    where.push(`(${ors.join(" OR ")})`);
    modes.forEach((v, i) => (params[`mode${i}`] = `%"${v}"%`));
  }
  if (filters.q) {
    // Free-text search across trainer name, area, and activity names.
    where.push(`(
      LOWER(t.name) LIKE @q
      OR LOWER(ar.name) LIKE @q
      OR EXISTS (
        SELECT 1 FROM trainer_activities taq
        JOIN activities aq ON aq.id = taq.activity_id
        WHERE taq.trainer_id = t.id AND LOWER(aq.name) LIKE @q
      )
    )`);
    params.q = `%${filters.q.toLowerCase()}%`;
  }
  if (filters.maxPrice) {
    where.push("(t.price_min IS NULL OR t.price_min <= @maxPrice)");
    params.maxPrice = filters.maxPrice;
  }

  let activityJoin = "";
  if (activities.length) {
    const keys = activities.map((_, i) => `@activity${i}`);
    activityJoin = `JOIN trainer_activities fta ON fta.trainer_id = t.id
      JOIN activities fa ON fa.id = fta.activity_id AND fa.slug IN (${keys.join(",")})`;
    activities.forEach((v, i) => (params[`activity${i}`] = v));
  }

  const having: string[] = [];
  if (filters.minRating) {
    having.push("avg_rating >= @minRating");
    params.minRating = filters.minRating;
  }

  // Aggregate ratings/counts in a single LEFT JOIN instead of two correlated
  // subqueries per row (each metered on D1). COUNT(DISTINCT) + CASE keep the
  // numbers correct when the optional activity join fans a trainer into
  // multiple rows.
  const sql = `
    SELECT t.*, ar.name AS area_name,
      COUNT(DISTINCT CASE WHEN r.status = 'approved' THEN r.id END) AS rec_count,
      ROUND(AVG(CASE WHEN r.status = 'approved' AND r.rating IS NOT NULL
                     THEN r.rating END), 1) AS avg_rating
    FROM trainers t
    JOIN areas ar ON ar.id = t.area_id
    ${activityJoin}
    LEFT JOIN recommendations r ON r.trainer_id = t.id
    WHERE ${where.join(" AND ")}
    GROUP BY t.id
    ${having.length ? "HAVING " + having.join(" AND ") : ""}
    ORDER BY rec_count DESC, t.created_at DESC
  `;
  const rows = await (await db()).all<TrainerRow>(sql, params);
  const acts = await activitiesByTrainer(rows.map((r) => r.id));
  return rows.map((r) => rowToTrainer(r, acts.get(r.id) ?? []));
}

export async function getTrainerBySlug(slug: string): Promise<Trainer | null> {
  const row = await (await db()).get<TrainerRow>(
    `SELECT t.*, ar.name AS area_name,
      COUNT(r.id) AS rec_count,
      ROUND(AVG(r.rating), 1) AS avg_rating
     FROM trainers t JOIN areas ar ON ar.id = t.area_id
     LEFT JOIN recommendations r
       ON r.trainer_id = t.id AND r.status = 'approved'
     WHERE t.slug = ?
     GROUP BY t.id`,
    [slug]
  );
  if (!row) return null;
  const acts = (await activitiesByTrainer([row.id])).get(row.id) ?? [];
  return rowToTrainer(row, acts);
}

export async function getRecommendations(
  trainerId: number
): Promise<Recommendation[]> {
  return (await db()).all<Recommendation>(
    `SELECT r.*, a.name AS activity_name
     FROM recommendations r LEFT JOIN activities a ON a.id = r.activity_id
     WHERE r.trainer_id = ? AND r.status = 'approved'
     ORDER BY r.helpful_count DESC, r.created_at DESC`,
    [trainerId]
  );
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

export async function adminListReports(): Promise<AdminReport[]> {
  const d = await db();
  const reports = await d.all<AdminReport>(
    "SELECT * FROM reports WHERE status = 'open' ORDER BY created_at DESC"
  );
  for (const r of reports) {
    if (r.target_type === "recommendation") {
      const rec = await d.get<{ body: string }>(
        "SELECT body FROM recommendations WHERE id = ?",
        [r.target_id]
      );
      r.preview = rec?.body ?? "(deleted)";
    } else if (r.target_type === "trainer") {
      const t = await d.get<{ name: string }>(
        "SELECT name FROM trainers WHERE id = ?",
        [r.target_id]
      );
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
  verified: number;
  claimed: number;
  contact_instagram: string | null;
  custom_activity: string | null;
  ig_exists: number | null;
  ig_followers: number | null;
  ig_checked_at: string | null;
  fake_score: number;
  fake_level: FakeLevel;
  fake_reasons: string[];
}

interface AdminTrainerRaw {
  id: number;
  slug: string;
  name: string;
  area_name: string;
  status: string;
  created_at: string;
  verified: number;
  claimed: number;
  contact_instagram: string | null;
  custom_activity: string | null;
  bio: string | null;
  price_min: number | null;
  created_by_anon: string | null;
  ig_exists: number | null;
  ig_followers: number | null;
  ig_checked_at: string | null;
  rec_count: number;
  self_rec_count: number;
  sibling_count: number;
}

function minutesSince(createdAt: string): number {
  // SQLite stores 'YYYY-MM-DD HH:MM:SS' in UTC; make it ISO before parsing.
  const ms = Date.parse(createdAt.replace(" ", "T") + "Z");
  if (Number.isNaN(ms)) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, (Date.now() - ms) / 60_000);
}

export async function adminListTrainers(): Promise<AdminTrainerRow[]> {
  const rows = await (await db()).all<AdminTrainerRaw>(
    `SELECT t.id, t.slug, t.name, ar.name AS area_name, t.status, t.created_at,
      t.verified, t.claimed, t.contact_instagram, t.custom_activity, t.bio,
      t.price_min, t.created_by_anon, t.ig_exists, t.ig_followers, t.ig_checked_at,
      (SELECT COUNT(*) FROM recommendations r WHERE r.trainer_id = t.id) AS rec_count,
      (SELECT COUNT(*) FROM recommendations r
         WHERE r.trainer_id = t.id AND t.created_by_anon IS NOT NULL
           AND r.anon_id = t.created_by_anon) AS self_rec_count,
      (SELECT COUNT(*) FROM trainers t2
         WHERE t.created_by_anon IS NOT NULL
           AND t2.created_by_anon = t.created_by_anon) AS sibling_count
     FROM trainers t JOIN areas ar ON ar.id = t.area_id
     ORDER BY t.created_at DESC LIMIT 200`
  );

  return rows
    .map((r) => {
      const fake = assessFake({
        recCount: r.rec_count,
        selfRecCount: r.self_rec_count,
        siblingCount: r.sibling_count,
        bio: r.bio,
        instagram: r.contact_instagram,
        priceMin: r.price_min,
        verified: !!r.verified,
        claimed: !!r.claimed,
        ageMinutes: minutesSince(r.created_at),
      });
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        area_name: r.area_name,
        status: r.status,
        rec_count: r.rec_count,
        created_at: r.created_at,
        verified: r.verified,
        claimed: r.claimed,
        contact_instagram: r.contact_instagram,
        custom_activity: r.custom_activity,
        ig_exists: r.ig_exists,
        ig_followers: r.ig_followers,
        ig_checked_at: r.ig_checked_at,
        fake_score: fake.score,
        fake_level: fake.level,
        fake_reasons: fake.reasons,
      };
    })
    .sort((a, b) => b.fake_score - a.fake_score);
}

export interface AdminStats {
  trainers_total: number;
  trainers_approved: number;
  trainers_pending: number;
  trainers_rejected: number;
  trainers_verified: number;
  recs_total: number;
  recs_pending: number;
  reports_open: number;
}

export async function adminStats(): Promise<AdminStats> {
  const d = await db();
  const one = async (sql: string) =>
    (await d.get<{ c: number }>(sql))?.c ?? 0;
  const [
    trainers_total,
    trainers_approved,
    trainers_pending,
    trainers_rejected,
    trainers_verified,
    recs_total,
    recs_pending,
    reports_open,
  ] = await Promise.all([
    one("SELECT COUNT(*) AS c FROM trainers WHERE status != 'merged'"),
    one("SELECT COUNT(*) AS c FROM trainers WHERE status = 'approved'"),
    one("SELECT COUNT(*) AS c FROM trainers WHERE status = 'pending'"),
    one("SELECT COUNT(*) AS c FROM trainers WHERE status = 'rejected'"),
    one("SELECT COUNT(*) AS c FROM trainers WHERE verified = 1"),
    one("SELECT COUNT(*) AS c FROM recommendations"),
    one("SELECT COUNT(*) AS c FROM recommendations WHERE status = 'pending'"),
    one("SELECT COUNT(*) AS c FROM reports WHERE status = 'open'"),
  ]);
  return {
    trainers_total,
    trainers_approved,
    trainers_pending,
    trainers_rejected,
    trainers_verified,
    recs_total,
    recs_pending,
    reports_open,
  };
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

export async function adminListRecommendations(): Promise<AdminRecRow[]> {
  return (await db()).all<AdminRecRow>(
    `SELECT r.id, r.body, r.status, r.rating, r.created_at,
      t.name AS trainer_name, t.slug AS trainer_slug
     FROM recommendations r JOIN trainers t ON t.id = r.trainer_id
     ORDER BY r.created_at DESC LIMIT 200`
  );
}

export interface AdminNotification {
  id: number;
  email: string;
  trainer_name: string;
  trainer_slug: string;
  sent: number;
  created_at: string;
}

export async function adminListNotifications(): Promise<AdminNotification[]> {
  return (await db()).all<AdminNotification>(
    `SELECT n.id, sp.email, t.name AS trainer_name, t.slug AS trainer_slug,
            n.sent, n.created_at
     FROM notifications n
     JOIN seeker_pins sp ON sp.id = n.seeker_pin_id
     JOIN trainers t ON t.id = n.trainer_id
     ORDER BY n.created_at DESC LIMIT 50`
  );
}

export interface AdminAuditRow {
  id: number;
  action: string;
  target_type: string;
  target_id: number | null;
  detail: string | null;
  created_at: string;
}

export async function adminListAudit(): Promise<AdminAuditRow[]> {
  return (await db()).all<AdminAuditRow>(
    "SELECT id, action, target_type, target_id, detail, created_at FROM admin_audit ORDER BY id DESC LIMIT 50"
  );
}

/** Which of the given recommendation ids has this anon visitor voted on. */
export async function getVotedRecIds(
  anonId: string | undefined,
  recIds: number[]
): Promise<number[]> {
  if (!anonId || recIds.length === 0) return [];
  const placeholders = recIds.map(() => "?").join(",");
  const rows = await (await db()).all<{ recommendation_id: number }>(
    `SELECT recommendation_id FROM rec_votes
     WHERE anon_id = ? AND recommendation_id IN (${placeholders})`,
    [anonId, ...recIds]
  );
  return rows.map((r) => r.recommendation_id);
}
