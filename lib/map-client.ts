// Client-safe map helpers (no server imports — used inside MapLibre components).

import type { RequestTransformFunction } from "maplibre-gl";

/**
 * Ola's style.json references glyphs/sprites/tiles WITHOUT the api_key, so
 * every sub-request 401s unless we re-append the key. Parse it from the style
 * URL and decorate all api.olamaps.io requests. No-op for other providers.
 */
export function olaTransform(
  styleUrl: string
): RequestTransformFunction | undefined {
  if (!styleUrl.includes("api.olamaps.io")) return undefined;
  let key: string | null = null;
  try {
    key = new URL(styleUrl).searchParams.get("api_key");
  } catch {
    return undefined;
  }
  if (!key) return undefined;
  return (url: string) => {
    if (url.startsWith("https://api.olamaps.io") && !url.includes("api_key=")) {
      return { url: `${url}${url.includes("?") ? "&" : "?"}api_key=${key}` };
    }
    return { url };
  };
}
