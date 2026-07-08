import { getSettings } from "@/lib/settings";

// Map configuration, admin-switchable (/admin/map, audit-logged):
//  - provider: "hybrid" (OpenFreeMap tiles — free, unmetered, keyless) vs
//    "ola" (Ola vector tiles — POI labels, metered 5M/mo, key exposed in the
//    style URL as with any tile service).
//  - hybrid base style: any hosted OpenFreeMap style, or "fmt-dark" — our
//    customized dark (served from public/fmt-dark.json): POI dots + names,
//    navy water, brighter street labels.
// Geocoding is unaffected either way.

export type MapProvider = "hybrid" | "ola";

/** Hybrid-provider base styles. Keep the MapPanel picker list in sync. */
export const HYBRID_STYLES = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  "fmt-dark": "/fmt-dark.json",
  fiord: "https://tiles.openfreemap.org/styles/fiord",
  liberty: "https://tiles.openfreemap.org/styles/liberty",
  bright: "https://tiles.openfreemap.org/styles/bright",
  positron: "https://tiles.openfreemap.org/styles/positron",
} as const;
export type HybridStyle = keyof typeof HYBRID_STYLES;
export const DEFAULT_HYBRID_STYLE: HybridStyle = "dark";
export const OPENFREEMAP_STYLE = HYBRID_STYLES[DEFAULT_HYBRID_STYLE];

export function isHybridStyle(v: string | null | undefined): v is HybridStyle {
  return !!v && v in HYBRID_STYLES;
}

const OLA_STYLE_ID = process.env.OLA_MAPS_STYLE || "eclipse-dark-standard";

export interface MapConfig {
  provider: MapProvider;
  styleUrl: string;
  hybridStyle: HybridStyle;
}

/** Pure resolver — unit-testable. Falls back to hybrid when Ola lacks a key;
 *  unknown style values fall back to the default (stock dark). */
export function resolveMapStyle(
  provider: string | null,
  olaKey: string | undefined,
  hybridStyle?: string | null
): MapConfig {
  const style = isHybridStyle(hybridStyle) ? hybridStyle : DEFAULT_HYBRID_STYLE;
  if (provider === "ola" && olaKey) {
    return {
      provider: "ola",
      styleUrl: `https://api.olamaps.io/tiles/vector/v1/styles/${OLA_STYLE_ID}/style.json?api_key=${olaKey}`,
      hybridStyle: style,
    };
  }
  return {
    provider: "hybrid",
    styleUrl: HYBRID_STYLES[style],
    hybridStyle: style,
  };
}

/** Server-side: read the admin settings (one query) → client style URL. */
export async function getMapConfig(): Promise<MapConfig> {
  const s = await getSettings(["map_provider", "map_style"]);
  return resolveMapStyle(
    s.map_provider,
    process.env.OLA_MAPS_API_KEY,
    s.map_style
  );
}
