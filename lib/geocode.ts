// Address search / reverse geocoding over two FREE providers — Photon (Komoot)
// and Nominatim (OpenStreetMap). We query both, normalize, and merge so a miss
// or rate-limit on one still returns results. Called server-side (see
// app/api/geocode) so we can send Nominatim a proper User-Agent and throttle.
// Results are biased + bounded to the active city (see lib/cities).

import { getCity, type CityBox } from "@/lib/cities";
import { cacheGet, cacheSet, forwardKey, reverseKey } from "@/lib/geocache";
import { bumpUsage } from "@/lib/usage";

export interface GeoResult {
  label: string;
  lat: number;
  lng: number;
  source: "ola" | "photon" | "nominatim";
  type?: string;
}

function inBox(lat: number, lng: number, b: CityBox): boolean {
  return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
}

// Identify ourselves per Nominatim usage policy.
const UA = "find-my-trainer/1.0 (https://find-my-trainer.bhoj-jatin.workers.dev)";

async function fetchJson(url: string, timeoutMs = 5000): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---- Photon ---------------------------------------------------------------

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string>;
}

function photonLabel(p: Record<string, string>): string {
  const parts = [
    [p.name, p.housenumber].filter(Boolean).join(" "),
    p.street,
    p.suburb || p.district,
    p.city,
    p.postcode,
  ].filter(Boolean);
  return parts.filter((v, i) => v && v !== parts[i - 1]).join(", ");
}

async function photon(q: string, citySlug?: string): Promise<GeoResult[]> {
  const city = getCity(citySlug);
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
    `&lat=${city.center.lat}&lon=${city.center.lng}&limit=6&lang=en`;
  const data = (await fetchJson(url)) as { features?: PhotonFeature[] } | null;
  if (!data?.features) return [];
  const out: GeoResult[] = [];
  for (const f of data.features) {
    const c = f.geometry?.coordinates;
    if (!c) continue;
    const [lng, lat] = c;
    if (!inBox(lat, lng, city.bbox)) continue;
    out.push({
      label: photonLabel(f.properties ?? {}) || "Unnamed place",
      lat,
      lng,
      source: "photon",
      type: f.properties?.osm_value,
    });
  }
  return out;
}

// ---- Nominatim ------------------------------------------------------------

interface NominatimItem {
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
}

async function nominatim(q: string, citySlug?: string): Promise<GeoResult[]> {
  const b = getCity(citySlug).bbox;
  const viewbox = `${b.minLng},${b.maxLat},${b.maxLng},${b.minLat}`;
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2` +
    `&q=${encodeURIComponent(q)}&limit=6&countrycodes=in` +
    `&viewbox=${viewbox}&bounded=1`;
  const data = (await fetchJson(url)) as NominatimItem[] | null;
  if (!Array.isArray(data)) return [];
  const out: GeoResult[] = [];
  for (const it of data) {
    const lat = Number(it.lat);
    const lng = Number(it.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!inBox(lat, lng, b)) continue;
    out.push({
      label: it.display_name ?? "Unnamed place",
      lat,
      lng,
      source: "nominatim",
      type: it.type,
    });
  }
  return out;
}

// ---- Ola Maps (Krutrim) -----------------------------------------------------
// Preferred provider when OLA_MAPS_API_KEY is set (5M free calls/mo, best
// free-tier granularity for Indian addresses). Defensive parsing: any schema
// surprise yields [] and the OSM providers below still answer.

const OLA_KEY = () => process.env.OLA_MAPS_API_KEY;

interface OlaPrediction {
  description?: string;
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
}

async function ola(q: string, citySlug?: string): Promise<GeoResult[]> {
  const key = OLA_KEY();
  if (!key) return [];
  const city = getCity(citySlug);
  const url =
    `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(q)}` +
    `&location=${city.center.lat},${city.center.lng}&api_key=${key}`;
  const data = (await fetchJson(url)) as {
    predictions?: OlaPrediction[];
  } | null;
  if (!Array.isArray(data?.predictions)) return [];
  const out: GeoResult[] = [];
  for (const p of data.predictions) {
    const lat = p.geometry?.location?.lat;
    const lng = p.geometry?.location?.lng;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    if (!inBox(lat, lng, city.bbox)) continue;
    out.push({
      label: p.description || p.formatted_address || "Unnamed place",
      lat,
      lng,
      source: "ola",
    });
  }
  return out;
}

// ---- Merge ----------------------------------------------------------------

/**
 * Forward geocode within a city, cached 30 days. Ola preferred when a key is
 * configured; Photon+Nominatim merged as the always-available base.
 */
export async function geocode(q: string, citySlug?: string): Promise<GeoResult[]> {
  const query = q.trim();
  if (query.length < 3) return [];

  const ck = forwardKey(query, citySlug);
  const cached = await cacheGet(ck);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as GeoResult[];
      await bumpUsage("geocode_fwd_cache");
      return parsed;
    } catch {
      /* fall through to live lookup */
    }
  }

  const usingOla = !!OLA_KEY();
  const [o, a, b] = await Promise.all([
    ola(query, citySlug),
    photon(query, citySlug),
    nominatim(query, citySlug),
  ]);
  await Promise.all([
    usingOla ? bumpUsage("geocode_fwd_ola") : null,
    bumpUsage("geocode_fwd_photon"),
    bumpUsage("geocode_fwd_nominatim"),
  ]);

  // Ola first (best Indian granularity), then interleave the OSM providers.
  const merged: GeoResult[] = [...o];
  const seen = new Set(o.map((r) => `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`));
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    for (const r of [a[i], b[i]]) {
      if (!r) continue;
      const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(r);
    }
  }
  const results = merged.slice(0, 8);
  // Cache only non-empty answers — a transient provider outage shouldn't pin
  // "no results" for 30 days.
  if (results.length) await cacheSet(ck, JSON.stringify(results));
  return results;
}

/** Reverse geocode a point to a human label (Nominatim, Photon fallback).
 *  Cached 30 days on ~11 m rounded coordinates — pin drags hit the cache. */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  const ck = reverseKey(lat, lng);
  const cached = await cacheGet(ck);
  if (cached) {
    await bumpUsage("geocode_rev_cache");
    return cached;
  }

  await bumpUsage("geocode_rev_live");
  const label = await reverseLive(lat, lng);
  if (label) await cacheSet(ck, label);
  return label;
}

async function reverseLive(lat: number, lng: number): Promise<string | null> {
  const nUrl =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lng}&zoom=18`;
  const n = (await fetchJson(nUrl)) as NominatimItem | null;
  if (n?.display_name) return n.display_name;

  const pUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
  const p = (await fetchJson(pUrl)) as { features?: PhotonFeature[] } | null;
  const f = p?.features?.[0];
  if (f?.properties) return photonLabel(f.properties) || null;
  return null;
}
