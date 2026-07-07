"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Area } from "@/lib/types";

// Two-tier location search for the home map:
//   1. Instant client-side matches over the city's known areas (no API call).
//   2. Debounced street/landmark results from /api/geocode (Ola/Photon/
//      Nominatim behind a cached proxy) for anything finer than an area.
function rank(areas: Area[], q: string): Area[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const scored = areas
    .map((a) => {
      const name = a.name.toLowerCase();
      let score = -1;
      if (name === needle) score = 0;
      else if (name.startsWith(needle)) score = 1;
      else if (name.includes(needle)) score = 2;
      else if (a.slug.includes(needle)) score = 3;
      return { a, score };
    })
    .filter((s) => s.score >= 0)
    .sort((x, y) => x.score - y.score || x.a.name.localeCompare(y.a.name));
  return scored.slice(0, 4).map((s) => s.a);
}

interface Place {
  label: string;
  lat: number;
  lng: number;
}

type Suggestion =
  | { kind: "area"; label: string; lat: number; lng: number; id: string }
  | { kind: "place"; label: string; lat: number; lng: number; id: string };

export default function LocationSearch({
  areas,
  activeLabel,
  onPick,
  onClear,
  className,
  city,
  cityName = "Bengaluru",
}: {
  areas: Area[];
  activeLabel: string | null;
  onPick: (p: { lat: number; lng: number; label: string }) => void;
  onClear: () => void;
  className?: string;
  city?: string;
  cityName?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [places, setPlaces] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const areaMatches = useMemo(() => rank(areas, query), [areas, query]);

  // Debounced street-level lookup once the query is substantial.
  useEffect(() => {
    if (query.trim().length < 3) {
      setPlaces([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(query)}&city=${city ?? ""}`,
          { signal: ctrl.signal }
        );
        const d = await res.json();
        setPlaces(
          ((d.results ?? []) as Place[]).slice(0, 5).map((r) => ({
            label: r.label,
            lat: r.lat,
            lng: r.lng,
          }))
        );
      } catch {
        /* keep area matches only */
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, city]);

  const suggestions: Suggestion[] = useMemo(() => {
    const areaLabels = new Set(areaMatches.map((a) => a.name.toLowerCase()));
    return [
      ...areaMatches.map((a) => ({
        kind: "area" as const,
        label: a.name,
        lat: a.lat,
        lng: a.lng,
        id: `a-${a.id}`,
      })),
      ...places
        .filter((p) => !areaLabels.has(p.label.toLowerCase()))
        .map((p, i) => ({
          kind: "place" as const,
          label: p.label,
          lat: p.lat,
          lng: p.lng,
          id: `p-${i}`,
        })),
    ];
  }, [areaMatches, places]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function choose(s: Suggestion) {
    // Short label for the "Near X" chip; street results keep their first part.
    const label = s.kind === "area" ? s.label : s.label.split(",")[0].trim();
    onPick({ lat: s.lat, lng: s.lng, label });
    setQuery("");
    setPlaces([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(suggestions[highlight] ?? suggestions[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className={`relative ${className ?? ""}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            🔍
          </span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => query && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={`Search an area or street in ${cityName}…`}
            className="input pl-9"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
          />
        </div>
        {activeLabel && (
          <button
            type="button"
            onClick={onClear}
            className="chip-accent flex shrink-0 items-center gap-1 whitespace-nowrap"
            title="Clear area focus"
          >
            Near {activeLabel} ✕
          </button>
        )}
      </div>

      {open && (suggestions.length > 0 || searching) && (
        <ul
          role="listbox"
          className="glass absolute z-20 mt-1 w-full overflow-hidden rounded-xl bg-slate-950/80 shadow-xl"
        >
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(s)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  i === highlight
                    ? "bg-pink-500/15 text-pink-200"
                    : "text-slate-200 hover:bg-white/5"
                }`}
              >
                <span className="text-slate-500">{s.kind === "area" ? "📍" : "🛣️"}</span>
                <span className="min-w-0 truncate">{s.label}</span>
                <span className="ml-auto shrink-0 text-xs text-slate-500">
                  {s.kind === "area" ? cityName : "street"}
                </span>
              </button>
            </li>
          ))}
          {searching && (
            <li className="px-3 py-2 text-xs text-slate-500">Searching streets…</li>
          )}
        </ul>
      )}
    </div>
  );
}
