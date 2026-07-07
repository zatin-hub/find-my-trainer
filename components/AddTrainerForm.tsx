"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Activity, Area } from "@/lib/types";
import { CITIES, DEFAULT_CITY } from "@/lib/cities";

// maplibre touches window → load client-only.
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
});

interface SimilarMatch {
  id: number;
  slug: string;
  name: string;
  area_name: string;
}

const STEPS: { title: string; subtitle: string }[] = [
  { title: "Who's the trainer?", subtitle: "Their name and where they train." },
  {
    title: "What do they coach?",
    subtitle: "Pick everything that applies.",
  },
  {
    title: "How do people reach them?",
    subtitle: "Instagram is required — pricing is optional.",
  },
  {
    title: "Your experience",
    subtitle: "Optional, but a first-hand note helps others most.",
  },
];
const TOTAL = STEPS.length;

// Instagram handle without the leading @ (1–30 of letters, numbers, . or _).
const IG_RE = /^[a-zA-Z0-9._]{1,30}$/;
const cleanHandle = (s: string) => s.trim().replace(/^@/, "");

const MODE_OPTIONS: [string, string][] = [
  ["in_person", "In person"],
  ["home_visit", "Home visit"],
  ["online", "Online"],
];

export default function AddTrainerForm({
  activities,
  areas,
}: {
  activities: Activity[];
  areas: Area[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [city, setCity] = useState(DEFAULT_CITY);
  const [area, setArea] = useState("");
  const [selActivities, setSelActivities] = useState<string[]>([]);
  const [activityQuery, setActivityQuery] = useState("");
  const [customActivity, setCustomActivity] = useState("");
  const [gender, setGender] = useState("");
  const [modes, setModes] = useState<string[]>([]);
  const [instagram, setInstagram] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [priceUnit, setPriceUnit] = useState("per_month");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [recommendation, setRecommendation] = useState("");
  const [rating, setRating] = useState(5);
  const [hp, setHp] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [similar, setSimilar] = useState<SimilarMatch[]>([]);

  // Suggest existing trainers as the user types, to avoid duplicates.
  useEffect(() => {
    if (name.trim().length < 2) {
      setSimilar([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      const params = new URLSearchParams({ name });
      if (area) params.set("area", area);
      fetch(`/api/trainers/similar?${params.toString()}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setSimilar(d.matches ?? []))
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [name, area]);

  const label = "mb-1.5 block text-sm font-medium text-slate-300";
  const filteredActivities = useMemo(() => {
    const query = activityQuery.trim().toLowerCase();
    if (!query) return activities;
    return activities.filter((a) => a.name.toLowerCase().includes(query));
  }, [activities, activityQuery]);
  const areasInCity = useMemo(
    () => areas.filter((a) => a.city === city),
    [areas, city]
  );

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  // Switching city clears the area + pin (they belong to the old city).
  function changeCity(slug: string) {
    setCity(slug);
    setArea("");
    setLat(null);
    setLng(null);
  }

  // Picking an area seeds the map pin at its centroid; the picker refines it.
  function selectArea(slug: string) {
    setArea(slug);
    const a = areas.find((x) => x.slug === slug);
    if (a) {
      setLat(a.lat);
      setLng(a.lng);
    }
  }

  // Returns an error string if the given step isn't complete, else "".
  function validate(s: number): string {
    if (s === 1) {
      if (name.trim().length < 2) return "Enter the trainer's name.";
      if (!area) return "Select an area.";
    }
    if (s === 2 && selActivities.length === 0 && !customActivity.trim())
      return "Pick at least one activity (or add a custom one).";
    if (s === 3 && !IG_RE.test(cleanHandle(instagram)))
      return "A valid Instagram handle is required.";
    return "";
  }

  function next() {
    const err = validate(step);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, TOTAL));
  }

  function back() {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function submit() {
    // Re-validate the gating steps before sending.
    for (const s of [1, 2, 3]) {
      const err = validate(s);
      if (err) {
        setError(err);
        setStep(s);
        return;
      }
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/trainers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        area,
        activities: selActivities,
        gender: gender || undefined,
        modes,
        contact_instagram: cleanHandle(instagram),
        price_min: priceMin ? Number(priceMin) : undefined,
        price_max: priceMax ? Number(priceMax) : undefined,
        price_unit: priceUnit,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        custom_activity: customActivity.trim() || undefined,
        recommendation: recommendation || undefined,
        rating: recommendation ? rating : undefined,
        website: hp || undefined,
      }),
    });
    setBusy(false);
    const data = await res.json();
    if (res.ok) router.push(`/trainer/${data.slug}`);
    else setError(data.error || "Something went wrong");
  }

  return (
    <div className="card p-6">
      {/* Progress — bar only, no step numbers */}
      <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-pink-400 transition-all duration-500 ease-out"
          style={{ width: `${(step / TOTAL) * 100}%` }}
        />
      </div>

      {/* Conversational heading for the current step */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white">
          {STEPS[step - 1].title}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {STEPS[step - 1].subtitle}
        </p>
      </div>

      {/* Honeypot: hidden from humans, catches bots */}
      <input
        type="text"
        name="website"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <div className="min-h-[300px]">
        {/* Step 1 — trainer + area */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className={label}>Trainer name *</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arjun Rao"
                className="input"
              />
              {similar.length > 0 && (
                <div className="mt-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm">
                  <p className="font-medium text-amber-300">
                    These may already exist — add your recommendation there
                    instead of creating a duplicate:
                  </p>
                  <ul className="mt-1 space-y-1">
                    {similar.map((m) => (
                      <li key={m.id}>
                        <Link
                          href={`/trainer/${m.slug}`}
                          className="text-pink-300 hover:underline"
                        >
                          {m.name}
                        </Link>{" "}
                        <span className="text-slate-400">· {m.area_name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div>
              <label className={label}>City *</label>
              <div className="flex flex-wrap gap-2">
                {CITIES.map((c) => (
                  <button
                    type="button"
                    key={c.slug}
                    onClick={() => changeCity(c.slug)}
                    className={
                      city === c.slug
                        ? "chip-accent cursor-pointer"
                        : "chip cursor-pointer hover:border-white/25"
                    }
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={label}>Area *</label>
              <select
                value={area}
                onChange={(e) => selectArea(e.target.value)}
                className="input"
              >
                <option value="">Select an area…</option>
                {areasInCity.map((a) => (
                  <option key={a.id} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            {area && (
              <div>
                <label className={label}>
                  Pin the exact spot{" "}
                  <span className="text-slate-500">
                    (optional — drag, click, or search)
                  </span>
                </label>
                <LocationPicker
                  key={city}
                  lat={lat}
                  lng={lng}
                  city={city}
                  onChange={(la, ln) => {
                    setLat(la);
                    setLng(ln);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 2 — activities + modes */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className={label}>Activities * (pick all that apply)</label>
              <input
                value={activityQuery}
                onChange={(e) => setActivityQuery(e.target.value)}
                placeholder="Search activities…"
                className="input mb-3"
              />
              <div className="flex flex-wrap gap-2">
                {filteredActivities.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => toggle(selActivities, setSelActivities, a.slug)}
                    className={
                      selActivities.includes(a.slug)
                        ? "chip-accent cursor-pointer"
                        : "chip cursor-pointer hover:border-white/25"
                    }
                  >
                    {a.icon} {a.name}
                  </button>
                ))}
                {filteredActivities.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No match — add it as a custom activity below.
                  </p>
                )}
              </div>

              {/* Custom activity for anything not in the list */}
              <div className="mt-3">
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Can&apos;t find it? Add your own
                </label>
                {customActivity.trim() ? (
                  <span className="chip-accent inline-flex items-center gap-2">
                    {customActivity.trim()}
                    <button
                      type="button"
                      onClick={() => setCustomActivity("")}
                      aria-label="Remove custom activity"
                      className="text-slate-300 hover:text-white"
                    >
                      ✕
                    </button>
                  </span>
                ) : (
                  <input
                    value={customActivity}
                    onChange={(e) => setCustomActivity(e.target.value)}
                    placeholder="e.g. Kalaripayattu, Aerial yoga…"
                    maxLength={40}
                    className="input"
                  />
                )}
              </div>
            </div>
            <div>
              <label className={label}>
                Modes <span className="text-slate-500">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {MODE_OPTIONS.map(([v, lbl]) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => toggle(modes, setModes, v)}
                    className={
                      modes.includes(v)
                        ? "chip-accent cursor-pointer"
                        : "chip cursor-pointer hover:border-white/25"
                    }
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — contact + pricing */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className={label}>Instagram *</label>
              <input
                autoFocus
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@handle"
                className="input"
              />
              <p className="mt-1 text-xs text-slate-500">
                Required — it helps others find and verify the trainer.
              </p>
            </div>
            <div>
              <label className={label}>
                Trainer gender <span className="text-slate-500">(optional)</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="input"
              >
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div>
              <label className={label}>
                Price range <span className="text-slate-500">(optional)</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="From ₹"
                  className="input"
                />
                <input
                  type="number"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="To ₹"
                  className="input"
                />
                <select
                  value={priceUnit}
                  onChange={(e) => setPriceUnit(e.target.value)}
                  className="input"
                >
                  <option value="per_month">/ month</option>
                  <option value="per_session">/ session</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — recommendation */}
        {step === 4 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Rating</span>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="input w-auto px-2 py-1"
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {"★".repeat(r)}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              rows={5}
              placeholder="Why do you recommend them? Share honest, first-hand experience."
              className="input"
            />
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 1 ? (
          <button type="button" onClick={back} className="btn-ghost">
            ← Back
          </button>
        ) : (
          <span />
        )}
        {step < TOTAL ? (
          <button type="button" onClick={next} className="btn-primary px-6">
            Continue →
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="btn-primary px-6"
          >
            {busy ? "Submitting…" : "Add trainer"}
          </button>
        )}
      </div>

      {step === TOTAL && (
        <p className="mt-4 text-center text-xs text-slate-500">
          Anonymous · No account · We never sell your data.
        </p>
      )}
    </div>
  );
}
