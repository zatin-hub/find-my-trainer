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

export default function MapView({
  trainers,
  selectedSlug,
  onSelect,
}: {
  trainers: Trainer[];
  selectedSlug?: string | null;
  onSelect?: (slug: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
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

  // Render markers when trainers change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const t of trainers) {
      const el = document.createElement("button");
      el.className =
        "flex items-center justify-center rounded-full border-2 border-white shadow-md transition-transform hover:scale-110";
      el.style.width = "30px";
      el.style.height = "30px";
      el.style.cursor = "pointer";
      el.style.background =
        t.slug === selectedSlug ? "#f43f5e" : "#10b981";
      el.style.boxShadow =
        t.slug === selectedSlug
          ? "0 0 0 4px rgba(244,63,94,0.25)"
          : "0 0 0 3px rgba(16,185,129,0.2)";
      el.style.fontSize = "14px";
      el.textContent = t.activities[0]?.icon ?? "📍";
      el.title = t.name;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelectRef.current?.(t.slug);
        map.flyTo({ center: [t.lng, t.lat], zoom: 13 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([t.lng, t.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [trainers, selectedSlug]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ minHeight: 400 }}
    />
  );
}
