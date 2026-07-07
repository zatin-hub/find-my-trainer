import { getSetting } from "@/lib/settings";

// Map tile-style selection: "hybrid" (OpenFreeMap tiles — free, unmetered,
// keyless) vs "ola" (Ola vector tiles — POI labels, Indic languages, metered
// 5M calls/mo, key exposed in the style URL as with any tile service).
// Admin-switchable for benchmarking; geocoding is unaffected either way.

export type MapProvider = "hybrid" | "ola";

export const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
const OLA_STYLE_ID = process.env.OLA_MAPS_STYLE || "eclipse-dark-standard";

/** Pure resolver — unit-testable. Falls back to hybrid when Ola lacks a key. */
export function resolveMapStyle(
  provider: string | null,
  olaKey: string | undefined
): { provider: MapProvider; styleUrl: string } {
  if (provider === "ola" && olaKey) {
    return {
      provider: "ola",
      styleUrl: `https://api.olamaps.io/tiles/vector/v1/styles/${OLA_STYLE_ID}/style.json?api_key=${olaKey}`,
    };
  }
  return { provider: "hybrid", styleUrl: OPENFREEMAP_STYLE };
}

/** Server-side: read the admin setting and produce the client style URL. */
export async function getMapConfig(): Promise<{
  provider: MapProvider;
  styleUrl: string;
}> {
  const setting = await getSetting("map_provider");
  return resolveMapStyle(setting, process.env.OLA_MAPS_API_KEY);
}
