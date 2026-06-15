"use client";

import { useState } from "react";
import type { Recommendation } from "@/lib/types";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-500">
      {"★".repeat(n)}
      <span className="text-slate-300">{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}

function RecCard({
  rec,
  initiallyVoted,
}: {
  rec: Recommendation;
  initiallyVoted: boolean;
}) {
  const [voted, setVoted] = useState(initiallyVoted);
  const [count, setCount] = useState(rec.helpful_count);
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);

  async function vote() {
    if (busy) return;
    setBusy(true);
    // optimistic
    setVoted((v) => !v);
    setCount((c) => c + (voted ? -1 : 1));
    const res = await fetch(`/api/recommendations/${rec.id}/vote`, {
      method: "POST",
    });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      setVoted(d.voted);
      setCount(d.count);
    }
  }

  async function report() {
    if (reported) return;
    if (!confirm("Report this recommendation for review?")) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_type: "recommendation", target_id: rec.id }),
    });
    setReported(true);
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <Stars n={rec.rating ?? 0} />
        <span className="text-xs text-slate-400">
          {rec.trained_duration ? `Trained ${rec.trained_duration}` : ""}
        </span>
      </div>
      <p className="mt-2 text-slate-700">{rec.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {rec.price_paid && (
          <span>
            Paid ₹{rec.price_paid.toLocaleString("en-IN")}
            {rec.price_unit === "per_session" ? "/session" : "/month"}
          </span>
        )}
        <button
          onClick={vote}
          disabled={busy}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition ${
            voted
              ? "border-emerald-600 bg-emerald-50 text-emerald-700"
              : "border-slate-300 text-slate-600 hover:border-slate-400"
          }`}
        >
          👍 Helpful · {count}
        </button>
        <button
          onClick={report}
          disabled={reported}
          className="text-slate-400 hover:text-red-600 disabled:text-slate-300"
        >
          {reported ? "Reported" : "Report"}
        </button>
      </div>
    </li>
  );
}

export default function RecommendationList({
  recs,
  votedIds,
}: {
  recs: Recommendation[];
  votedIds: number[];
}) {
  const votedSet = new Set(votedIds);
  if (recs.length === 0)
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No recommendations yet. Be the first.
      </p>
    );
  return (
    <ul className="space-y-3">
      {recs.map((r) => (
        <RecCard key={r.id} rec={r} initiallyVoted={votedSet.has(r.id)} />
      ))}
    </ul>
  );
}
