"use client";

import { useState } from "react";
import type { Activity, Area } from "@/lib/types";

export default function SeekerPinForm({
  activities,
  areas,
}: {
  activities: Activity[];
  areas: Area[];
}) {
  const [email, setEmail] = useState("");
  const [activity, setActivity] = useState("");
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const input = "input";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/seeker-pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
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
      <p className="text-sm text-emerald-300">
        ✓ Got it. We&apos;ll email you when a matching trainer is added nearby.
        (Email is logged in local dev — your pin was saved.)
      </p>
    );

  return (
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
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
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={input}
      />
      <select value={activity} onChange={(e) => setActivity(e.target.value)} className={input}>
        <option value="">Any activity</option>
        {activities.map((a) => (
          <option key={a.id} value={a.slug}>
            {a.icon} {a.name}
          </option>
        ))}
      </select>
      <select value={area} onChange={(e) => setArea(e.target.value)} className={input}>
        <option value="">Any area</option>
        {areas.map((a) => (
          <option key={a.id} value={a.slug}>
            {a.name}
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Max budget ₹ (optional)"
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
        className={input}
      />
      <div className="sm:col-span-2">
        <button disabled={busy} className="btn-primary">
          {busy ? "Saving…" : "Notify me"}
        </button>
        {error && <span className="ml-3 text-sm text-rose-400">{error}</span>}
      </div>
    </form>
  );
}
