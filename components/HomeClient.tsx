"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Activity, Area, Trainer } from "@/lib/types";
import FilterBar from "@/components/FilterBar";
import LocationSearch from "@/components/LocationSearch";
import TrainerDetail from "@/components/TrainerDetail";
import { formatPrice, formatDistance, ratingStars } from "@/lib/format";
import { distanceMeters } from "@/lib/geo";
import { getCity } from "@/lib/cities";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

// Cycled in the trainer search box so it reads as searchable by any attribute.
const SEARCH_PLACEHOLDERS = [
  "Search by trainer name, e.g. Arjun…",
  "Search by area, e.g. Koramangala…",
  "Search by activity, e.g. Yoga…",
];

export default function HomeClient({
  initialTrainers,
  activities,
  areas,
  city,
  mapStyleUrl,
}: {
  initialTrainers: Trainer[];
  activities: Activity[];
  areas: Area[];
  city: string;
  mapStyleUrl?: string;
}) {
  const [trainers, setTrainers] = useState<Trainer[]>(initialTrainers);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const [activity, setActivity] = useState<string[]>([]);
  const [area, setArea] = useState<string[]>([]);
  const [mode, setMode] = useState<string[]>([]);
  const [gender, setGender] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [minRating, setMinRating] = useState(0);
  const [q, setQ] = useState("");

  // Location focus from the area search bar: re-centers the map and sorts
  // trainers by distance ("closer or same") without hard-filtering them out.
  const [near, setNear] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams();
    params.set("city", city);
    if (activity.length) params.set("activity", activity.join(","));
    if (area.length) params.set("area", area.join(","));
    if (mode.length) params.set("mode", mode.join(","));
    if (gender.length) params.set("gender", gender.join(","));
    if (maxPrice !== "") params.set("maxPrice", String(maxPrice));
    if (minRating) params.set("minRating", String(minRating));
    if (q) params.set("q", q);

    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/trainers?${params.toString()}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setTrainers(d.trainers))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [city, activity, area, mode, gender, maxPrice, minRating, q]);

  // Areas + map center scoped to the active city.
  const areasInCity = useMemo(
    () => areas.filter((a) => a.city === city),
    [areas, city]
  );
  const cityCenter = useMemo(() => getCity(city).center, [city]);

  // City is driven by the header dropdown (?city= param). When it changes,
  // clear area-scoped state that no longer applies.
  useEffect(() => {
    setArea([]);
    setNear(null);
    setSelected(null);
  }, [city]);

  const selectedTrainer = useMemo(
    () => trainers.find((t) => t.slug === selected) ?? null,
    [trainers, selected]
  );

  // Pin click opens an inline profile panel in the list column (hover only
  // highlights). Back button / Esc / basemap click return to the list.
  const [open, setOpen] = useState<string | null>(null);
  const openTrainer = useMemo(
    () => trainers.find((t) => t.slug === open) ?? null,
    [trainers, open]
  );
  const closeDetail = () => {
    setOpen(null);
    setSelected(null);
  };

  // Full-page map (lg only): map goes fixed-fullscreen, detail panel floats
  // on top of it. Esc closes the panel first, then exits the full map.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    document.body.style.overflow = expanded ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [expanded]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (open) closeDetail();
      else setExpanded(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (!open || expanded) return;
    // On mobile the panel sits below the map — bring it into view on open.
    if (window.innerWidth < 1024)
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Edge fade for the list: only fade the side that has off-screen content
  // (top when scrolled down, bottom when more below) — never a static mask.
  const listRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ top: false, bottom: false });
  function updateFade() {
    const el = listRef.current;
    if (!el) return;
    const top = el.scrollTop > 1;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    // Only set state when it actually changes (avoids a render loop).
    setFade((prev) =>
      prev.top === top && prev.bottom === bottom ? prev : { top, bottom }
    );
  }
  useEffect(() => {
    updateFade();
    const onResize = () => updateFade();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // Recompute when the list content changes (height may change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainers]);
  const fadeMask = (() => {
    if (!fade.top && !fade.bottom) return undefined; // no scroll → no fade
    const top = fade.top ? "transparent 0, #000 32px" : "#000 0";
    const bottom = fade.bottom
      ? "#000 calc(100% - 32px), transparent 100%"
      : "#000 100%";
    return `linear-gradient(to bottom, ${top}, ${bottom})`;
  })();

  // When an area is searched, attach distance and order closest-first.
  const displayed = useMemo(() => {
    if (!near) return trainers.map((t) => ({ t, dist: null as number | null }));
    return trainers
      .map((t) => ({ t, dist: distanceMeters(near.lat, near.lng, t.lat, t.lng) }))
      .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
  }, [trainers, near]);

  // Filter panel: open state, active count (chips/price/rating), and a reset.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeCount =
    activity.length +
    area.length +
    mode.length +
    gender.length +
    (maxPrice !== "" ? 1 : 0) +
    (minRating ? 1 : 0);
  function clearFilters() {
    setActivity([]);
    setArea([]);
    setMode([]);
    setGender([]);
    setMaxPrice("");
    setMinRating(0);
  }

  // Close the filter modal on Escape and lock background scroll while open.
  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFiltersOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  // Rotate the trainer-search placeholder while the box is empty.
  const [phIdx, setPhIdx] = useState(0);
  useEffect(() => {
    if (q) return;
    const id = setInterval(
      () => setPhIdx((i) => (i + 1) % SEARCH_PLACEHOLDERS.length),
      2800
    );
    return () => clearInterval(id);
  }, [q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      {/* Heading */}
      <h1 className="mb-4 text-xl font-bold tracking-tight text-white sm:text-2xl">
        Trainers your neighbours actually rate.
      </h1>

      {/* One grid so each search bar stays attached to its section on mobile
          (location → map, trainer search → list); two columns on lg. */}
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_440px] lg:gap-x-6">
        {/* Above the map: area search */}
        <div className="order-1 lg:order-none">
          <LocationSearch
            areas={areasInCity}
            city={city}
            cityName={getCity(city).name}
            activeLabel={near?.label ?? null}
            onPick={(p) => {
              setNear({ lat: p.lat, lng: p.lng, label: p.label });
              setSelected(null);
            }}
            onClear={() => setNear(null)}
          />
        </div>

        {/* Above the trainer list: name/attribute search + filters */}
        <div className="order-3 lg:order-none lg:pl-6">
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={SEARCH_PLACEHOLDERS[phIdx]}
              className="input flex-1"
            />
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              className="btn-outline flex shrink-0 items-center gap-2 whitespace-nowrap"
            >
              <span aria-hidden>⚙️</span>
              Filters
              {activeCount > 0 && (
                <span className="rounded-full bg-pink-500 px-1.5 py-0.5 text-xs font-semibold leading-none text-slate-950">
                  {activeCount}
                </span>
              )}
              <span aria-hidden className="text-xs text-slate-500">
                {filtersOpen ? "▲" : "▼"}
              </span>
            </button>
          </div>
          {!filtersOpen && (
            <p className="mt-1 text-xs text-slate-500">
              {activeCount > 0
                ? `${activeCount} filter${activeCount === 1 ? "" : "s"} applied`
                : "No filters applied"}
            </p>
          )}
        </div>

      {/* Trainer-filter modal (fixed — takes no grid slot) */}
      {filtersOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Filter trainers"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="glass relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-2xl bg-slate-950/70 shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="text-base font-semibold text-white">
                Filter trainers
              </h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
                className="btn-ghost px-2 py-1 text-slate-400"
              >
                ✕
              </button>
            </div>
            <div className="flex min-h-0 flex-1">
              <FilterBar
                activity={activity}
                setActivity={setActivity}
                area={area}
                setArea={setArea}
                mode={mode}
                setMode={setMode}
                gender={gender}
                setGender={setGender}
                maxPrice={maxPrice}
                setMaxPrice={setMaxPrice}
                minRating={minRating}
                setMinRating={setMinRating}
                activities={activities}
                areas={areasInCity}
              />
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={clearFilters}
                disabled={activeCount === 0}
                className="btn-ghost text-slate-400 disabled:opacity-40"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="btn-primary"
              >
                Show {trainers.length} trainer{trainers.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Map — attached to its search bar on mobile; expandable on lg */}
        <div
          className={
            expanded
              ? // Below the sticky header (z-50) so the brand bar stays visible.
                "fmt-map-expanded fixed inset-x-0 bottom-0 top-[63px] z-40 bg-slate-950"
              : "relative order-2 h-[360px] overflow-hidden rounded-2xl border border-white/10 lg:order-none lg:h-[640px]"
          }
        >
          <MapView
            trainers={trainers}
            selectedSlug={selected}
            onSelect={(slug) => {
              setSelected(slug);
              setOpen(slug);
            }}
            onBackgroundClick={closeDetail}
            center={cityCenter}
            focus={near}
            styleUrl={mapStyleUrl}
          />
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="absolute left-3 top-3 z-10 hidden items-center gap-2 rounded-xl border border-white/15 bg-slate-950/85 px-3.5 py-2 text-sm font-medium text-slate-100 shadow-lg backdrop-blur-md transition hover:border-pink-400/50 hover:text-pink-200 lg:inline-flex"
          >
            <span aria-hidden className="text-base leading-none">
              {expanded ? "✕" : "⛶"}
            </span>
            {expanded ? "Exit full map" : "Full map"}
          </button>
          {expanded && openTrainer && (
            <div className="absolute right-4 top-4 z-10 max-h-[calc(100%-5rem)] w-[400px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/85 p-3 backdrop-blur-md">
              <TrainerDetail trainer={openTrainer} onBack={closeDetail} />
            </div>
          )}
          {expanded && (
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-2 border-t border-white/10 bg-slate-950/80 px-4 py-2 text-xs text-slate-400 backdrop-blur">
              <span className="font-semibold text-slate-200">
                📍 find<span className="text-pink-400">my</span>trainer
              </span>
              <span aria-hidden>·</span>
              <a href="/privacy" className="underline hover:text-slate-200">
                Privacy
              </a>
              <span aria-hidden>·</span>
              <a href="/terms" className="underline hover:text-slate-200">
                Terms
              </a>
              <span aria-hidden>·</span>
              <span>
                Map data ©{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-slate-200"
                >
                  OpenStreetMap contributors
                </a>
              </span>
            </div>
          )}
        </div>

        {/* List */}
        <div
          ref={listRef}
          onScroll={updateFade}
          style={fadeMask ? { maskImage: fadeMask, WebkitMaskImage: fadeMask } : undefined}
          className="order-4 lg:order-none lg:h-[640px] lg:overflow-y-auto lg:border-l lg:border-white/10 lg:pl-6"
        >
          {openTrainer ? (
            <TrainerDetail trainer={openTrainer} onBack={closeDetail} />
          ) : (
            <>
          <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
            <span>
              {loading ? "Loading…" : `${trainers.length} trainer${trainers.length === 1 ? "" : "s"}`}
              {near && !loading && ` · closest to ${near.label}`}
            </span>
          </div>
          <ul className="space-y-3">
            {displayed.map(({ t, dist }) => (
              <li key={t.id} onMouseEnter={() => setSelected(t.slug)}>
                <Link
                  href={`/trainer/${t.slug}`}
                  className={`card block p-4 transition ${
                    selectedTrainer?.slug === t.slug
                      ? "border-pink-400/60 ring-2 ring-pink-500/30"
                      : "card-hover"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-slate-100">
                          {t.name}
                        </span>
                        {t.verified && (
                          <span
                            title="Verified — claimed by the trainer"
                            className="shrink-0 text-pink-400"
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-sm text-slate-400">
                        {t.area_name} · {t.activities.map((a) => a.name).join(", ")}
                      </div>
                      {dist != null && (
                        <div className="mt-0.5 text-xs text-pink-400/80">
                          ~{formatDistance(dist)} from {near?.label}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      {t.avg_rating ? (
                        <div className="text-pink-400">{ratingStars(t.avg_rating)}</div>
                      ) : (
                        <div className="text-slate-500">No rating yet</div>
                      )}
                      <div className="text-xs text-slate-500">
                        {t.rec_count} rec{t.rec_count === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                  {t.bio && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                      {t.bio}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="chip">
                      {formatPrice(t.price_min, t.price_max, t.price_unit)}
                    </span>
                    {t.modes.map((m) => (
                      <span key={m} className="chip-accent">
                        {m.replace("_", " ")}
                      </span>
                    ))}
                    {/* Card is one big <Link>; a nested <a> is invalid HTML. */}
                    <button
                      type="button"
                      className="chip ml-auto cursor-pointer hover:border-pink-400/50 hover:text-pink-200"
                      title="Open directions in Google Maps"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }}
                    >
                      Directions ↗
                    </button>
                  </div>
                  {t.languages.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">
                      🗣 {t.languages.join(", ")}
                    </div>
                  )}
                </Link>
              </li>
            ))}
            {!loading && trainers.length === 0 && (
              <li className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">
                No trainers match these filters yet.{" "}
                <Link href="/add" className="font-medium text-pink-400 underline">
                  Recommend one
                </Link>
                .
              </li>
            )}
          </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
