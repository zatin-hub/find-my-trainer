// Address search / reverse geocoding over two FREE providers — Photon (Komoot)
// and Nominatim (OpenStreetMap). We query both, normalize, and merge so a miss
// or rate-limit on one still returns results. Called server-side (see
// app/api/geocode) so we can send Nominatim a proper User-Agent and throttle.
// Results are biased + bounded to the active city (see lib/cities).

import { getCity, type CityBox } from "@/lib/cities";

export interface GeoResult {
  label: string;
  lat: number;
  lng: number;
  source: "photon" | "nominatim";
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

// ---- Merge ----------------------------------------------------------------

/** Forward geocode via both providers within a city, merged + deduped (max 8). */
export async function geocode(q: string, citySlug?: string): Promise<GeoResult[]> {
  const query = q.trim();
  if (query.length < 3) return [];
  const [a, b] = await Promise.all([
    photon(query, citySlug),
    nominatim(query, citySlug),
  ]);

  const merged: GeoResult[] = [];
  const seen = new Set<string>();
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
  return merged.slice(0, 8);
}

/** Reverse geocode a point to a human label (Nominatim, Photon fallback). */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
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
