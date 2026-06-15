"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RecommendForm({ trainerSlug }: { trainerSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [pricePaid, setPricePaid] = useState("");
  const [priceUnit, setPriceUnit] = useState("per_month");
  const [duration, setDuration] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trainer: trainerSlug,
        rating,
        body,
        price_paid: pricePaid ? Number(pricePaid) : undefined,
        price_unit: priceUnit,
        trained_duration: duration || undefined,
        website: hp || undefined,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setBody("");
      setPricePaid("");
      setDuration("");
      setOpen(false);
      router.refresh();
    } else {
      setError((await res.json()).error || "Something went wrong");
    }
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        + Add your recommendation
      </button>
    );

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
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
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Rating</label>
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
        required
        minLength={10}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What was your experience? Be specific and honest — this helps others."
        rows={3}
        className={input}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <input
          type="number"
          placeholder="Price you paid ₹"
          value={pricePaid}
          onChange={(e) => setPricePaid(e.target.value)}
          className={input}
        />
        <select value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)} className={input}>
          <option value="per_month">per month</option>
          <option value="per_session">per session</option>
        </select>
        <input
          placeholder="How long? e.g. 3 months"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className={input}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Posting…" : "Post recommendation"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Anonymous · No account needed · Please share only first-hand experience.
      </p>
    </form>
  );
}
