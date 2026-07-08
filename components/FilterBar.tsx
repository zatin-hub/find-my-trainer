"use client";

import { useState } from "react";
import type { Activity, Area } from "@/lib/types";

const MODES: { value: string; label: string }[] = [
  { value: "in_person", label: "In person" },
  { value: "home_visit", label: "Home visit" },
  { value: "online", label: "Online" },
];

const GENDERS: { value: string; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

const RATINGS: { value: number; label: string }[] = [
  { value: 3, label: "3★+" },
  { value: 4, label: "4★+" },
];

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer py-1.5 lg:py-1 ${active ? "chip-accent" : "chip hover:border-white/25"}`}
    >
      {children}
    </button>
  );
}

type CatKey = "activity" | "area" | "mode" | "gender" | "rating" | "price";

// Master-detail filter panel: category list on the left, that category's
// options on the right. Nothing is cropped — each side scrolls independently.
export default function FilterBar({
  activity,
  setActivity,
  area,
  setArea,
  mode,
  setMode,
  gender,
  setGender,
  maxPrice,
  setMaxPrice,
  minRating,
  setMinRating,
  activities,
  areas,
}: {
  activity: string[];
  setActivity: (v: string[]) => void;
  area: string[];
  setArea: (v: string[]) => void;
  mode: string[];
  setMode: (v: string[]) => void;
  gender: string[];
  setGender: (v: string[]) => void;
  maxPrice: number | "";
  setMaxPrice: (v: number | "") => void;
  minRating: number;
  setMinRating: (v: number) => void;
  activities: Activity[];
  areas: Area[];
}) {
  const [cat, setCat] = useState<CatKey>("activity");

  const cats: { key: CatKey; label: string; count: number }[] = [
    { key: "activity", label: "Activity", count: activity.length },
    { key: "area", label: "Area", count: area.length },
    { key: "mode", label: "Mode", count: mode.length },
    { key: "gender", label: "Trainer", count: gender.length },
    { key: "rating", label: "Min rating", count: minRating ? 1 : 0 },
    { key: "price", label: "Max price", count: maxPrice !== "" ? 1 : 0 },
  ];

  return (
    <div className="flex min-h-0 w-full">
      {/* Left: categories */}
      <nav className="w-32 shrink-0 space-y-1 overflow-y-auto border-r border-white/10 p-2 sm:w-44">
        {cats.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCat(c.key)}
            className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
              cat === c.key
                ? "bg-pink-500/15 font-medium text-pink-200"
                : "text-slate-300 hover:bg-white/5"
            }`}
          >
            <span className="truncate">{c.label}</span>
            {c.count > 0 && (
              <span className="shrink-0 rounded-full bg-pink-500 px-1.5 py-0.5 text-xs font-semibold leading-none text-slate-950">
                {c.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Right: options for the selected category */}
      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        {cat === "activity" && (
          <div className="flex flex-wrap gap-2">
            {activities.map((a) => (
              <Chip
                key={a.id}
                active={activity.includes(a.slug)}
                onClick={() => setActivity(toggle(activity, a.slug))}
              >
                {a.icon} {a.name}
              </Chip>
            ))}
          </div>
        )}

        {cat === "area" && (
          <div className="flex flex-wrap gap-2">
            {areas.map((a) => (
              <Chip
                key={a.id}
                active={area.includes(a.slug)}
                onClick={() => setArea(toggle(area, a.slug))}
              >
                {a.name}
              </Chip>
            ))}
          </div>
        )}

        {cat === "mode" && (
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <Chip
                key={m.value}
                active={mode.includes(m.value)}
                onClick={() => setMode(toggle(mode, m.value))}
              >
                {m.label}
              </Chip>
            ))}
          </div>
        )}

        {cat === "gender" && (
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => (
              <Chip
                key={g.value}
                active={gender.includes(g.value)}
                onClick={() => setGender(toggle(gender, g.value))}
              >
                {g.label}
              </Chip>
            ))}
          </div>
        )}

        {cat === "rating" && (
          <div className="flex flex-wrap gap-2">
            {RATINGS.map((r) => (
              <Chip
                key={r.value}
                active={minRating === r.value}
                onClick={() => setMinRating(minRating === r.value ? 0 : r.value)}
              >
                {r.label}
              </Chip>
            ))}
          </div>
        )}

        {cat === "price" && (
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Max price (₹)
            </label>
            <input
              type="number"
              min={0}
              step={500}
              value={maxPrice}
              onChange={(e) =>
                setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="Any budget"
              className="input w-48"
            />
          </div>
        )}
      </div>
    </div>
  );
}
