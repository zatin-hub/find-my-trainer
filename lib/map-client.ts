// Client-safe map helpers (no server imports — used inside MapLibre components).

import type { RequestTransformFunction } from "maplibre-gl";

// ---- Tile usage beacon ------------------------------------------------------
// Ola exposes no usage API, so we count our own tile/glyph/sprite requests at
// the transformRequest chokepoint and report in batches (analytics only).
let pending = 0;
let flushListener = false;

function flushUsage() {
  if (pending <= 0) return;
  const n = pending;
  pending = 0;
  try {
    navigator.sendBeacon(
      "/api/usage",
      new Blob([JSON.stringify({ kind: "ola_tile", n })], {
        type: "application/json",
      })
    );
  } catch {
    /* analytics only */
  }
}

function countOlaRequest() {
  pending++;
  if (!flushListener && typeof document !== "undefined") {
    flushListener = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushUsage();
    });
  }
  if (pending >= 25) flushUsage();
}

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
    if (url.startsWith("https://api.olamaps.io")) {
      countOlaRequest();
      if (!url.includes("api_key=")) {
        return { url: `${url}${url.includes("?") ? "&" : "?"}api_key=${key}` };
      }
    }
    return { url };
  };
}
