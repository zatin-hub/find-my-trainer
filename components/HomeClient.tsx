"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Activity, Area, Trainer } from "@/lib/types";
import SeekerPinForm from "@/components/SeekerPinForm";
import { formatPrice, ratingStars } from "@/lib/format";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function HomeClient({
  initialTrainers,
  activities,
  areas,
}: {
  initialTrainers: Trainer[];
  activities: Activity[];
  areas: Area[];
}) {
  const [trainers, setTrainers] = useState<Trainer[]>(initialTrainers);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [showSeeker, setShowSeeker] = useState(false);

  const [activity, setActivity] = useState("");
  const [area, setArea] = useState("");
  const [mode, setMode] = useState("");
  const [gender, setGender] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams();
    if (activity) params.set("activity", activity);
    if (area) params.set("area", area);
    if (mode) params.set("mode", mode);
    if (gender) params.set("gender", gender);
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
  }, [activity, area, mode, gender, q]);

  const selectClass =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

  const selectedTrainer = useMemo(
    () => trainers.find((t) => t.slug === selected) ?? null,
    [trainers, selected]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      {/* Hero */}
      <div className="mb-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-7 text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Find a trainer your neighbours actually rate.
        </h1>
        <p className="mt-1 max-w-2xl text-emerald-50">
          Crowdsourced fitness trainer recommendations across Bengaluru —
          anonymously, on a map, with no spam calls. Free.
        </p>
        <button
          onClick={() => setShowSeeker((s) => !s)}
          className="mt-4 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium ring-1 ring-white/30 hover:bg-white/25"
        >
          🔔 Can&apos;t find one? Get an alert when a match appears
        </button>
        {showSeeker && (
          <div className="mt-4 rounded-xl bg-white p-4 text-slate-900">
            <SeekerPinForm activities={activities} areas={areas} />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name…"
          className={selectClass + " min-w-[160px] flex-1"}
        />
        <select value={activity} onChange={(e) => setActivity(e.target.value)} className={selectClass}>
          <option value="">All activities</option>
          {activities.map((a) => (
            <option key={a.id} value={a.slug}>
              {a.icon} {a.name}
            </option>
          ))}
        </select>
        <select value={area} onChange={(e) => setArea(e.target.value)} className={selectClass}>
          <option value="">All areas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.slug}>
              {a.name}
            </option>
          ))}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)} className={selectClass}>
          <option value="">Any mode</option>
          <option value="in_person">In person</option>
          <option value="home_visit">Home visit</option>
          <option value="online">Online</option>
        </select>
        <select value={gender} onChange={(e) => setGender(e.target.value)} className={selectClass}>
          <option value="">Any trainer</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        {/* Map */}
        <div className="order-2 h-[420px] overflow-hidden rounded-2xl border border-slate-200 lg:order-1 lg:h-[640px]">
          <MapView trainers={trainers} selectedSlug={selected} onSelect={setSelected} />
        </div>

        {/* List */}
        <div className="order-1 lg:order-2 lg:h-[640px] lg:overflow-y-auto">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
            <span>
              {loading ? "Loading…" : `${trainers.length} trainer${trainers.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <ul className="space-y-3">
            {trainers.map((t) => (
              <li
                key={t.id}
                onMouseEnter={() => setSelected(t.slug)}
                className={`rounded-xl border bg-white p-4 transition ${
                  selectedTrainer?.slug === t.slug
                    ? "border-emerald-500 ring-2 ring-emerald-200"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/trainer/${t.slug}`}
                      className="font-semibold hover:text-emerald-700"
                    >
                      {t.name}
                    </Link>
                    <div className="mt-0.5 text-sm text-slate-500">
                      {t.area_name} · {t.activities.map((a) => a.name).join(", ")}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    {t.avg_rating ? (
                      <div className="text-amber-500">{ratingStars(t.avg_rating)}</div>
                    ) : (
                      <div className="text-slate-400">No rating yet</div>
                    )}
                    <div className="text-xs text-slate-500">
                      {t.rec_count} rec{t.rec_count === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                    {formatPrice(t.price_min, t.price_max, t.price_unit)}
                  </span>
                  {t.modes.map((m) => (
                    <span key={m} className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                      {m.replace("_", " ")}
                    </span>
                  ))}
                </div>
              </li>
            ))}
            {!loading && trainers.length === 0 && (
              <li className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No trainers match these filters yet.{" "}
                <Link href="/add" className="font-medium text-emerald-700 underline">
                  Recommend one
                </Link>
                .
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
