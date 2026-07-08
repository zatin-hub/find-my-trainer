"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Trainer } from "@/lib/types";
import { olaTransform } from "@/lib/map-client";

const BENGALURU: [number, number] = [77.5946, 12.9716];

// Free vector tiles, no API key. Default is our customized bright style
// (public/fmt-bright.json); degrades to stock OpenFreeMap bright, then
// MapLibre demo tiles if offline.
const STYLE_URL = "/fmt-bright.json";
const OFM_FALLBACK = "https://tiles.openfreemap.org/styles/bright";
const FALLBACK_STYLE = "https://demotiles.maplibre.org/style.json";

// Color the inner dot for the selected / default state. The face stays
// neutral so the activity emoji reads; the Splunk palette (orange selected,
// magenta default) lives in the border + glow ring.
function styleDot(dot: HTMLElement, selected: boolean) {
  dot.style.background = "#fdfdfc";
  dot.style.borderColor = selected ? "#ff7a28" : "#ff2a7a";
  dot.style.boxShadow = selected
    ? "0 0 0 4px rgba(255,122,40,0.4), 0 1px 6px rgba(0,0,0,0.4)"
    : "0 0 0 3px rgba(255,42,122,0.3), 0 1px 6px rgba(0,0,0,0.4)";
  // Stacking lives on the marker root (siblings compete there, and the
  // hover tooltip must ride above neighbouring pins — see .fmt-pin:hover).
  const root = dot.parentElement;
  if (root) root.style.zIndex = selected ? "2" : "1";
}

export default function MapView({
  trainers,
  selectedSlug,
  onSelect,
  onBackgroundClick,
  center,
  focus,
  styleUrl,
}: {
  trainers: Trainer[];
  selectedSlug?: string | null;
  onSelect?: (slug: string) => void;
  // Click on the basemap (not a pin) — used to dismiss the detail panel.
  onBackgroundClick?: () => void;
  center?: { lat: number; lng: number; zoom?: number } | null;
  // Searched location: gets its own distinct pin (orange) on the map.
  focus?: { lat: number; lng: number; label?: string } | null;
  // Admin-selected tile style (hybrid=OpenFreeMap / ola). Defaults to hybrid.
  styleUrl?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const dotsRef = useRef<Map<string, HTMLElement>>(new Map());
  const focusRef = useRef<maplibregl.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onBackgroundClickRef = useRef(onBackgroundClick);
  onBackgroundClickRef.current = onBackgroundClick;

  // Init map once (per style — admin provider switch remounts via key/prop).
  const activeStyle = styleUrl || STYLE_URL;
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // Self-hosted styles (e.g. /fmt-dark.json) arrive as root-relative paths.
    const resolvedStyle = activeStyle.startsWith("/")
      ? new URL(activeStyle, window.location.origin).href
      : activeStyle;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: resolvedStyle,
      center: BENGALURU,
      zoom: 11,
      // No on-map attribution badge; OSM credit lives in the site footer.
      attributionControl: false,
      transformRequest: olaTransform(activeStyle),
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "top-right"
    );
    // The basemap's one-way street arrows (visible z15+) read as clutter on a
    // trainer map — hide them whenever a style (re)loads.
    const hideOneway = () => {
      for (const id of ["road_oneway", "road_oneway_opposite"]) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
      }
    };
    map.on("styledata", hideOneway);
    map.on("load", hideOneway);
    // Pin clicks stopPropagation, so this only fires for the basemap.
    map.on("click", () => onBackgroundClickRef.current?.());
    // Style failure → degrade down the chain: custom/Ola → OpenFreeMap
    // bright → MapLibre demo tiles.
    const fallbacks = [OFM_FALLBACK, FALLBACK_STYLE].filter(
      (u) => u !== resolvedStyle && u !== activeStyle
    );
    let fallbackStep = 0;
    map.on("error", (e) => {
      const msg = String(e?.error?.message || "");
      if (msg.includes("style") || msg.includes("Failed to fetch")) {
        const next = fallbacks[fallbackStep++];
        if (!next) return;
        try {
          map.setStyle(next);
        } catch {
          /* ignore */
        }
      }
    });
    mapRef.current = map;
    // Follow container size changes (e.g. the full-map toggle).
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    // Debug handle for headless inspection (harmless in prod).
    (window as unknown as { __fmtMap?: unknown }).__fmtMap = map;
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // activeStyle is fixed for the lifetime of a page load (SSR-provided).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      el.className = "fmt-pin";
      el.style.cursor = "pointer";

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className =
        "flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white transition-transform duration-150 hover:scale-110";
      dot.style.fontSize = "14px";
      dot.textContent = t.activities[0]?.icon ?? "📍";
      dot.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelectRef.current?.(t.slug);
      });
      el.appendChild(dot);

      // Hover tooltip: name, primary activity (+N more), area. Built with
      // textContent — trainer fields are user-submitted.
      const tip = document.createElement("div");
      tip.className = "map-tip";
      const tipName = document.createElement("div");
      tipName.className = "map-tip-name";
      tipName.textContent = t.name;
      const tipMeta = document.createElement("div");
      tipMeta.className = "map-tip-meta";
      const primary = t.activities[0];
      tipMeta.append(primary ? `${primary.icon} ${primary.name}` : "Trainer");
      if (t.activities.length > 1) {
        tipMeta.append(" ");
        const more = document.createElement("span");
        more.className = "map-tip-more";
        more.textContent = `+${t.activities.length - 1}`;
        tipMeta.append(more);
      }
      if (t.area_name) tipMeta.append(` · ${t.area_name}`);
      tip.append(tipName, tipMeta);
      el.appendChild(tip);

      styleDot(dot, t.slug === selectedSlug);
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

  // Re-center on city change (search focus owns the camera while active).
  const focusActiveRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center || focusActiveRef.current) return;
    map.flyTo({ center: [center.lng, center.lat], zoom: center.zoom ?? 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);

  // Searched location: orange pin + label, and fit the view to the spot PLUS
  // the 3 nearest trainers so results stay visible (blind deep zoom hid them).
  const trainersRef = useRef(trainers);
  trainersRef.current = trainers;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    focusRef.current?.remove();
    focusRef.current = null;
    const hadFocus = focusActiveRef.current;
    focusActiveRef.current = !!focus;
    if (!focus) {
      // Cleared → return to the city view.
      if (hadFocus && center)
        map.flyTo({ center: [center.lng, center.lat], zoom: center.zoom ?? 13 });
      return;
    }
    const marker = new maplibregl.Marker({ color: "#ff8a2b" })
      .setLngLat([focus.lng, focus.lat])
      .addTo(map);
    if (focus.label) {
      marker.setPopup(
        new maplibregl.Popup({ closeButton: false, offset: 24 }).setText(
          focus.label
        )
      );
      marker.togglePopup();
    }
    focusRef.current = marker;

    const bounds = new maplibregl.LngLatBounds(
      [focus.lng, focus.lat],
      [focus.lng, focus.lat]
    );
    [...trainersRef.current]
      .map((t) => ({
        t,
        d: (t.lat - focus.lat) ** 2 + (t.lng - focus.lng) ** 2,
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .forEach(({ t }) => bounds.extend([t.lng, t.lat]));
    map.fitBounds(bounds, { padding: 80, maxZoom: 15.5, duration: 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ minHeight: 400 }}
    />
  );
}
