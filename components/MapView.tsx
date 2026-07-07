"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Trainer } from "@/lib/types";

const BENGALURU: [number, number] = [77.5946, 12.9716];

// Free vector tiles, no API key. Dark style to match the theme; falls back to
// MapLibre demo tiles if offline.
const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";
const FALLBACK_STYLE = "https://demotiles.maplibre.org/style.json";

// Color the inner dot for the selected / default state.
function styleDot(dot: HTMLElement, selected: boolean) {
  // Splunk palette: orange when selected, magenta by default.
  dot.style.background = selected ? "#ff7a28" : "#ff2a7a";
  dot.style.boxShadow = selected
    ? "0 0 0 4px rgba(255,122,40,0.35)"
    : "0 0 0 3px rgba(255,42,122,0.28)";
  dot.style.zIndex = selected ? "2" : "1";
}

export default function MapView({
  trainers,
  selectedSlug,
  onSelect,
  center,
}: {
  trainers: Trainer[];
  selectedSlug?: string | null;
  onSelect?: (slug: string) => void;
  center?: { lat: number; lng: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const dotsRef = useRef<Map<string, HTMLElement>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: BENGALURU,
      zoom: 11,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // Compact attribution renders expanded on load; collapse it to the ⓘ badge
    // (clicking the badge still expands it).
    map.on("load", () => {
      containerRef.current
        ?.querySelector(".maplibregl-ctrl-attrib")
        ?.classList.remove("maplibregl-compact-show");
    });
    map.on("error", (e) => {
      // If the primary tile source fails (e.g. offline), swap to demo tiles.
      const msg = String(e?.error?.message || "");
      if (msg.includes("style") || msg.includes("Failed to fetch")) {
        try {
          map.setStyle(FALLBACK_STYLE);
        } catch {
          /* ignore */
        }
      }
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Build markers only when the trainer set changes. The marker root is a
  // positioning-only wrapper (MapLibre sets its transform); the visual circle
  // is an inner element, so its hover scale can't fight MapLibre's positioning.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    dotsRef.current.clear();

    for (const t of trainers) {
      const el = document.createElement("div");
      el.style.cursor = "pointer";

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className =
        "flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white transition-transform duration-150 hover:scale-110";
      dot.style.fontSize = "14px";
      dot.textContent = t.activities[0]?.icon ?? "📍";
      dot.title = t.name;
      styleDot(dot, t.slug === selectedSlug);
      dot.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelectRef.current?.(t.slug);
      });
      el.appendChild(dot);
      dotsRef.current.set(t.slug, dot);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([t.lng, t.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
    // selectedSlug intentionally omitted: selection only recolors, below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainers]);

  // Recolor markers on selection — no teardown/rebuild, so no flicker. Also
  // pan the map to the selected trainer (e.g. when picked from the list).
  useEffect(() => {
    for (const [slug, dot] of dotsRef.current) {
      styleDot(dot, slug === selectedSlug);
    }
    const map = mapRef.current;
    if (!map || !selectedSlug) return;
    const t = trainers.find((tr) => tr.slug === selectedSlug);
    if (t) map.flyTo({ center: [t.lng, t.lat], zoom: Math.max(map.getZoom(), 13) });
  }, [selectedSlug, trainers]);

  // Re-center when an area is searched from the location search bar.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    map.flyTo({ center: [center.lng, center.lat], zoom: 13 });
  }, [center]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ minHeight: 400 }}
    />
  );
}
