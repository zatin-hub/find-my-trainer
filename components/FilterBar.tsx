"use client";

import { useMemo, useState } from "react";
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
  { value: 3, label: "3★ & up" },
  { value: 4, label: "4★ & up" },
];

const PRICE_PRESETS = [1000, 2500, 5000, 10000];

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
      {active && <span aria-hidden>✓ </span>}
      {children}
    </button>
  );
}

// Collapsible section: the header row always shows what's selected (summary),
// so the modal opens as six scannable rows instead of a wall of chips.
function Section({
  label,
  count,
  summary,
  onClear,
  children,
}: {
  label: string;
  count: number;
  summary: string;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="border-b border-white/5 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-slate-200">{label}</span>
        {count > 0 && (
          <span className="rounded-full bg-pink-500 px-1.5 py-0.5 text-xs font-semibold leading-none text-slate-950">
            {count}
          </span>
        )}
        <span
          className={`ml-auto truncate text-xs ${count > 0 ? "font-medium text-pink-300" : "text-slate-500"}`}
        >
          {summary}
        </span>
        <span
          aria-hidden
          className={`shrink-0 text-xs text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="pb-4">
          {count > 0 && onClear && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-slate-500 transition hover:text-pink-300"
              >
                Clear {label.toLowerCase()}
              </button>
            </div>
          )}
          {children}
        </div>
      )}
    </section>
  );
}

/** "Yoga, Zumba +2" style summary for a section header. */
function summarize(names: string[], empty: string): string {
  if (names.length === 0) return empty;
  const shown = names.slice(0, 2).join(", ");
  return names.length > 2 ? `${shown} +${names.length - 2}` : shown;
}

// One scrollable panel of labeled sections — every category (and what's
// selected in it) visible at a glance; areas get their own mini-search.
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
  const [areaQ, setAreaQ] = useState("");
  const visibleAreas = useMemo(() => {
    const q = areaQ.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter((a) => a.name.toLowerCase().includes(q));
  }, [areas, areaQ]);

  const names = (slugs: string[], list: { slug?: string; value?: string; name?: string; label?: string }[]) =>
    list
      .filter((x) => slugs.includes((x.slug ?? x.value)!))
      .map((x) => (x.name ?? x.label)!);

  return (
    <div className="min-h-0 w-full overflow-y-auto px-5">
      <Section
        label="Activity"
        count={activity.length}
        summary={summarize(names(activity, activities), "Any activity")}
        onClear={() => setActivity([])}
      >
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
      </Section>

      <Section
        label="Area"
        count={area.length}
        summary={summarize(names(area, areas), "Anywhere in the city")}
        onClear={() => setArea([])}
      >
        <input
          value={areaQ}
          onChange={(e) => setAreaQ(e.target.value)}
          placeholder="Find an area…"
          className="input mb-2.5 max-w-xs py-1.5 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {visibleAreas.map((a) => (
            <Chip
              key={a.id}
              active={area.includes(a.slug)}
              onClick={() => setArea(toggle(area, a.slug))}
            >
              {a.name}
            </Chip>
          ))}
          {visibleAreas.length === 0 && (
            <p className="text-xs text-slate-500">No area matches “{areaQ}”.</p>
          )}
        </div>
      </Section>

      <Section
        label="Mode"
        count={mode.length}
        summary={summarize(names(mode, MODES), "Any mode")}
        onClear={() => setMode([])}
      >
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
      </Section>

      <Section
        label="Trainer"
        count={gender.length}
        summary={summarize(names(gender, GENDERS), "Any trainer")}
        onClear={() => setGender([])}
      >
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
      </Section>

      <Section
        label="Min rating"
        count={minRating ? 1 : 0}
        summary={minRating ? `${minRating}★ & up` : "Any rating"}
        onClear={() => setMinRating(0)}
      >
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
      </Section>

      <Section
        label="Max price"
        count={maxPrice !== "" ? 1 : 0}
        summary={
          maxPrice !== "" ? `≤ ₹${maxPrice.toLocaleString("en-IN")}` : "Any budget"
        }
        onClear={() => setMaxPrice("")}
      >
        <div className="flex flex-wrap items-center gap-2">
          {PRICE_PRESETS.map((p) => (
            <Chip
              key={p}
              active={maxPrice === p}
              onClick={() => setMaxPrice(maxPrice === p ? "" : p)}
            >
              ≤ ₹{p.toLocaleString("en-IN")}
            </Chip>
          ))}
          <input
            type="number"
            min={0}
            step={500}
            value={maxPrice}
            onChange={(e) =>
              setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="Custom ₹"
            className="input w-32 py-1.5 text-sm"
          />
        </div>
      </Section>
    </div>
  );
}
