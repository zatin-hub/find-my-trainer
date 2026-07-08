"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getCity } from "@/lib/cities";
import { olaTransform } from "@/lib/map-client";

const STYLE_URL = "/fmt-bright.json";

interface GeoResult {
  label: string;
  lat: number;
  lng: number;
  source: "photon" | "nominatim";
}

export default function LocationPicker({
  lat,
  lng,
  city,
  onChange,
  styleUrl,
}: {
  lat: number | null;
  lng: number | null;
  city?: string;
  // label is filled asynchronously once reverse-geocoding resolves.
  onChange: (lat: number, lng: number, label?: string) => void;
  styleUrl?: string;
}) {
  const cityRef = useRef(city);
  cityRef.current = city;
  const cityCenter = getCity(city).center;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [searching, setSearching] = useState(false);

  // Reverse-geocode a point and report it upward + show it.
  async function resolveLabel(la: number, ln: number) {
    try {
      const res = await fetch(`/api/geocode?lat=${la}&lng=${ln}`);
      const d = await res.json();
      if (d.label) {
        setLabel(d.label);
        onChangeRef.current(la, ln, d.label);
      }
    } catch {
      /* keep coords-only */
    }
  }

  // Init map + draggable marker once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start: [number, number] =
      lat != null && lng != null
        ? [lng, lat]
        : [cityCenter.lng, cityCenter.lat];
    const active = styleUrl || STYLE_URL;
    const map = new maplibregl.Map({
      container: containerRef.current,
      // Self-hosted styles arrive as root-relative paths.
      style: active.startsWith("/")
        ? new URL(active, window.location.origin).href
        : active,
      center: start,
      zoom: lat != null ? 14 : 11,
      attributionControl: { compact: true },
      transformRequest: olaTransform(active),
    });
    map.on("load", () => {
      containerRef.current
        ?.querySelector(".maplibregl-ctrl-attrib")
        ?.classList.remove("maplibregl-compact-show");
    });

    const marker = new maplibregl.Marker({ color: "#ff2a7a", draggable: true })
      .setLngLat(start)
      .addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLngLat();
      onChangeRef.current(p.lat, p.lng);
      resolveLabel(p.lat, p.lng);
    });
    // Click anywhere on the map to move the pin there.
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      onChangeRef.current(e.lngLat.lat, e.lngLat.lng);
      resolveLabel(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync if the parent moves the point (e.g. area change).
  useEffect(() => {
    if (lat == null || lng == null) return;
    markerRef.current?.setLngLat([lng, lat]);
    mapRef.current?.easeTo({ center: [lng, lat] });
  }, [lat, lng]);

  // Debounced address search.
  useEffect(() => {
    if (q.trim().length < 3) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(q)}&city=${cityRef.current ?? ""}`,
          { signal: ctrl.signal }
        );
        const d = await res.json();
        setResults(d.results ?? []);
        setOpen(true);
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  function pick(r: GeoResult) {
    setQ(r.label);
    setLabel(r.label);
    setOpen(false);
    setResults([]);
    markerRef.current?.setLngLat([r.lng, r.lat]);
    mapRef.current?.flyTo({ center: [r.lng, r.lat], zoom: 15 });
    onChangeRef.current(r.lat, r.lng, r.label);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search address, street, or landmark…"
          className="input"
        />
        {open && results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur">
            {results.map((r, i) => (
              <li key={`${r.source}-${i}`}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                >
                  <span className="mt-0.5 shrink-0 text-xs text-slate-500">
                    {r.source === "photon" ? "◈" : "◆"}
                  </span>
                  <span className="min-w-0 text-slate-200">{r.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-xl border border-white/10"
        style={{ height: 260 }}
      />

      <p className="text-xs text-slate-500">
        {searching
          ? "Searching…"
          : label
            ? `📍 ${label}`
            : "Drag the pin or click the map to set the exact spot."}
      </p>
    </div>
  );
}
