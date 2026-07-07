"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Area } from "@/lib/types";

// Free, client-side area autocomplete over the known Bengaluru localities — no
// external geocoder, no API key, instant. Ranks exact/prefix matches first.
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
  return scored.slice(0, 6).map((s) => s.a);
}

export default function LocationSearch({
  areas,
  activeLabel,
  onSelect,
  onClear,
  className,
  cityName = "Bengaluru",
}: {
  areas: Area[];
  activeLabel: string | null;
  onSelect: (area: Area) => void;
  onClear: () => void;
  className?: string;
  cityName?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => rank(areas, query), [areas, query]);

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

  function choose(area: Area) {
    onSelect(area);
    setQuery("");
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
            placeholder={`Search an area in ${cityName}…`}
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

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="glass absolute z-20 mt-1 w-full overflow-hidden rounded-xl bg-slate-950/80 shadow-xl"
        >
          {suggestions.map((a, i) => (
            <li key={a.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(a)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  i === highlight
                    ? "bg-pink-500/15 text-pink-200"
                    : "text-slate-200 hover:bg-white/5"
                }`}
              >
                <span className="text-slate-500">📍</span>
                {a.name}
                <span className="ml-auto text-xs text-slate-500">{cityName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
