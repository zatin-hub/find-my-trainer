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
  isOwner,
  trainerSlug,
}: {
  rec: Recommendation;
  initiallyVoted: boolean;
  isOwner: boolean;
  trainerSlug: string;
}) {
  const [voted, setVoted] = useState(initiallyVoted);
  const [count, setCount] = useState(rec.helpful_count);
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);
  const [reply, setReply] = useState(rec.reply ?? "");
  const [editingReply, setEditingReply] = useState(false);
  const [savedReply, setSavedReply] = useState(rec.reply ?? "");

  async function saveReply() {
    setBusy(true);
    const res = await fetch(`/api/trainers/${trainerSlug}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendation_id: rec.id, reply }),
    });
    setBusy(false);
    if (res.ok) {
      setSavedReply(reply.trim());
      setEditingReply(false);
    }
  }

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

      {/* Owner reply, visible to everyone */}
      {savedReply && !editingReply && (
        <div className="mt-3 rounded-lg border-l-2 border-emerald-500 bg-emerald-50/60 p-3 text-sm">
          <div className="mb-0.5 text-xs font-medium text-emerald-700">
            Reply from trainer
          </div>
          <p className="text-slate-700">{savedReply}</p>
          {isOwner && (
            <button
              onClick={() => setEditingReply(true)}
              className="mt-1 text-xs text-emerald-700 hover:underline"
            >
              Edit reply
            </button>
          )}
        </div>
      )}

      {isOwner && (!savedReply || editingReply) && (
        <div className="mt-3">
          {!editingReply && !savedReply ? (
            <button
              onClick={() => setEditingReply(true)}
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              + Reply as the trainer
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="Respond professionally — thank them or add context."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveReply}
                  disabled={busy}
                  className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  Save reply
                </button>
                <button
                  onClick={() => {
                    setReply(savedReply);
                    setEditingReply(false);
                  }}
                  className="rounded-md px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function RecommendationList({
  recs,
  votedIds,
  isOwner = false,
  trainerSlug,
}: {
  recs: Recommendation[];
  votedIds: number[];
  isOwner?: boolean;
  trainerSlug: string;
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
        <RecCard
          key={r.id}
          rec={r}
          initiallyVoted={votedSet.has(r.id)}
          isOwner={isOwner}
          trainerSlug={trainerSlug}
        />
      ))}
    </ul>
  );
}
