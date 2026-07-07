// Runtime detection shared by the data + rate-limit layers.

/**
 * True only in the Cloudflare Workers runtime (workerd) — NOT in `next dev`
 * (Node), so local dev + tests always take the SQLite / in-memory paths.
 */
export function inWorkers(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.userAgent === "Cloudflare-Workers"
  );
}
