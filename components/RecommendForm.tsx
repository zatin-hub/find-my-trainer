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

  const input = "input";

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
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Add your recommendation
      </button>
    );

  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
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
        <label className="text-sm font-medium text-slate-300">Rating</label>
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
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="btn-primary">
          {busy ? "Posting…" : "Post recommendation"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Anonymous · No account needed · Please share only first-hand experience.
      </p>
    </form>
  );
}
