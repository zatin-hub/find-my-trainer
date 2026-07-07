"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Activity, Area } from "@/lib/types";
import { CITIES, DEFAULT_CITY, getCity } from "@/lib/cities";

const STEP_TITLES = ["Your email", "What & where", "Budget & confirm"];
const TOTAL = STEP_TITLES.length;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MatchAlertForm({
  activities,
  areas,
}: {
  activities: Activity[];
  areas: Area[];
}) {
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [city, setCity] = useState(DEFAULT_CITY);
  const [activity, setActivity] = useState(""); // single slug, "" = any
  const [area, setArea] = useState(""); // single slug, "" = anywhere
  const areasInCity = useMemo(
    () => areas.filter((a) => a.city === city),
    [areas, city]
  );
  const [budget, setBudget] = useState("");
  const [hp, setHp] = useState(""); // honeypot

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const label = "mb-1.5 block text-sm font-medium text-slate-300";
  const activityName = useMemo(
    () => activities.find((a) => a.slug === activity)?.name ?? "Any activity",
    [activities, activity]
  );
  const areaName = useMemo(
    () => areas.find((a) => a.slug === area)?.name ?? "Anywhere",
    [areas, area]
  );

  function validate(s: number): string {
    if (s === 1 && !EMAIL_RE.test(email.trim()))
      return "Enter a valid email address.";
    return "";
  }

  function next() {
    const err = validate(step);
    if (err) return setError(err);
    setError("");
    setStep((s) => Math.min(s + 1, TOTAL));
  }
  function back() {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function submit() {
    const err = validate(1);
    if (err) {
      setError(err);
      setStep(1);
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/seeker-pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        activity: activity || undefined,
        area: area || undefined,
        budget_max: budget ? Number(budget) : undefined,
        website: hp || undefined,
      }),
    });
    setBusy(false);
    if (res.ok) setDone(true);
    else setError((await res.json()).error || "Something went wrong");
  }

  if (done)
    return (
      <div className="card p-6 text-center">
        <div className="text-4xl">🔔</div>
        <h2 className="mt-3 text-lg font-semibold text-white">You&apos;re on the list</h2>
        <p className="mt-1 text-sm text-slate-400">
          We&apos;ll email <span className="text-slate-200">{email}</span> when a{" "}
          {activityName.toLowerCase()} trainer is added in {areaName.toLowerCase()}.
          (In local dev the email is logged, not sent.)
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/" className="btn-primary px-6">
            Back to map
          </Link>
        </div>
      </div>
    );

  return (
    <div className="card p-6">
      {/* Progress */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-400">
          <span>
            Step {step} of {TOTAL} · {STEP_TITLES[step - 1]}
          </span>
          <span>{Math.round((step / TOTAL) * 100)}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-pink-400 transition-all duration-300 ease-out"
            style={{ width: `${(step / TOTAL) * 100}%` }}
          />
        </div>
      </div>

      {/* Honeypot */}
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

      <div className="min-h-[240px]">
        {/* Step 1 — email */}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className={label}>Email *</label>
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input"
              />
              <p className="mt-1 text-xs text-slate-500">
                Only used to send this one alert. No spam, no selling — ever.
              </p>
            </div>
          </div>
        )}

        {/* Step 2 — activity + area */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className={label}>City</label>
              <div className="flex flex-wrap gap-2">
                {CITIES.map((c) => (
                  <button
                    type="button"
                    key={c.slug}
                    onClick={() => {
                      setCity(c.slug);
                      setArea("");
                    }}
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
              <label className={label}>
                Activity <span className="text-slate-500">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActivity("")}
                  className={
                    activity === ""
                      ? "chip-accent cursor-pointer"
                      : "chip cursor-pointer hover:border-white/25"
                  }
                >
                  Any
                </button>
                {activities.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => setActivity(a.slug)}
                    className={
                      activity === a.slug
                        ? "chip-accent cursor-pointer"
                        : "chip cursor-pointer hover:border-white/25"
                    }
                  >
                    {a.icon} {a.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={label}>
                Area <span className="text-slate-500">(optional)</span>
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="input"
              >
                <option value="">Anywhere in {getCity(city).name}</option>
                {areasInCity.map((a) => (
                  <option key={a.id} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3 — budget + review */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className={label}>
                Max budget ₹ <span className="text-slate-500">(optional)</span>
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 3000"
                className="input"
              />
            </div>
            <dl className="space-y-3 text-sm">
              <Row label="Email" value={email} />
              <Row label="Activity" value={activityName} />
              <Row label="Area" value={areaName} />
              <Row label="Max budget" value={budget ? `₹${budget}` : "—"} />
            </dl>
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
            {busy ? "Saving…" : "Notify me"}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-white/5 pb-2">
      <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-slate-200">{value || "—"}</dd>
    </div>
  );
}
