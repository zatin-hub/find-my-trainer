"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Activity, Area } from "@/lib/types";

export default function AddTrainerForm({
  activities,
  areas,
}: {
  activities: Activity[];
  areas: Area[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [selActivities, setSelActivities] = useState<string[]>([]);
  const [gender, setGender] = useState("");
  const [modes, setModes] = useState<string[]>([]);
  const [instagram, setInstagram] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [priceUnit, setPriceUnit] = useState("per_month");
  const [bio, setBio] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";
  const label = "mb-1 block text-sm font-medium text-slate-700";

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (selActivities.length === 0) {
      setError("Pick at least one activity.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/trainers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        area,
        activities: selActivities,
        gender: gender || undefined,
        modes,
        contact_instagram: instagram || undefined,
        price_min: priceMin ? Number(priceMin) : undefined,
        price_max: priceMax ? Number(priceMax) : undefined,
        price_unit: priceUnit,
        bio: bio || undefined,
        recommendation: recommendation || undefined,
        rating: recommendation ? rating : undefined,
        price_unit_rec: priceUnit,
      }),
    });
    setBusy(false);
    const data = await res.json();
    if (res.ok) router.push(`/trainer/${data.slug}`);
    else setError(data.error || "Something went wrong");
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div>
        <label className={label}>Trainer name *</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
      </div>

      <div>
        <label className={label}>Area *</label>
        <select required value={area} onChange={(e) => setArea(e.target.value)} className={input}>
          <option value="">Select an area…</option>
          {areas.map((a) => (
            <option key={a.id} value={a.slug}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label}>Activities * (pick all that apply)</label>
        <div className="flex flex-wrap gap-2">
          {activities.map((a) => (
            <button
              type="button"
              key={a.id}
              onClick={() => toggle(selActivities, setSelActivities, a.slug)}
              className={`rounded-full border px-3 py-1 text-sm ${
                selActivities.includes(a.slug)
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {a.icon} {a.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Trainer gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={input}>
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>
        <div>
          <label className={label}>Instagram (optional)</label>
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@handle"
            className={input}
          />
        </div>
      </div>

      <div>
        <label className={label}>Modes</label>
        <div className="flex flex-wrap gap-2">
          {[
            ["in_person", "In person"],
            ["home_visit", "Home visit"],
            ["online", "Online"],
          ].map(([v, lbl]) => (
            <button
              type="button"
              key={v}
              onClick={() => toggle(modes, setModes, v)}
              className={`rounded-full border px-3 py-1 text-sm ${
                modes.includes(v)
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={label}>Price from ₹</label>
          <input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Price to ₹</label>
          <input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Per</label>
          <select value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)} className={input}>
            <option value="per_month">month</option>
            <option value="per_session">session</option>
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Short bio (optional)</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className={input} />
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <label className={label}>Your recommendation (optional but encouraged)</label>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm text-slate-600">Rating</span>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
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
          rows={3}
          placeholder="Why do you recommend them? Share honest, first-hand experience."
          className={input}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        disabled={busy}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Add trainer"}
      </button>
      <p className="text-center text-xs text-slate-400">
        Anonymous · No account · We never sell your data.
      </p>
    </form>
  );
}
