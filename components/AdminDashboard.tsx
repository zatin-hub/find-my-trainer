"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  AdminNotification,
  AdminRecRow,
  AdminReport,
  AdminTrainerRow,
} from "@/lib/queries";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    approved: "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20",
    pending: "bg-amber-400/10 text-amber-300 border border-amber-400/20",
    rejected: "bg-rose-500/10 text-rose-300 border border-rose-400/20",
    merged: "bg-white/10 text-slate-400 border border-white/10",
    open: "bg-amber-400/10 text-amber-300 border border-amber-400/20",
    resolved: "bg-white/5 text-slate-500 border border-white/10",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${map[status] ?? "bg-white/10"}`}>
      {status}
    </span>
  );
}

export default function AdminDashboard({
  reports,
  trainers,
  recs,
  notifications,
}: {
  reports: AdminReport[];
  trainers: AdminTrainerRow[];
  recs: AdminRecRow[];
  notifications: AdminNotification[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: string, id: number, extra?: Record<string, unknown>) {
    setBusy(true);
    await fetch("/api/admin/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id, ...extra }),
    });
    setBusy(false);
    router.refresh();
  }

  function mergeTrainer(id: number, name: string) {
    const into = window.prompt(
      `Merge "${name}" INTO which trainer? Enter the target trainer's numeric id (its recommendations move to the target; this one is hidden).`
    );
    const intoId = Number(into);
    if (!Number.isInteger(intoId) || intoId === id) return;
    act("merge_trainer", id, { into_id: intoId });
  }

  const btn =
    "rounded-md px-2 py-1 text-xs font-medium disabled:opacity-50";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Moderation</h1>
        <Link href="/" className="text-sm text-emerald-400 hover:underline">
          ← Site
        </Link>
      </div>

      {/* Reports */}
      <section className="mt-6">
        <h2 className="mb-2 text-lg font-semibold">
          Open reports ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing flagged. 🎉</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.07] p-3 text-sm"
              >
                <div className="text-slate-300">
                  <span className="font-medium text-slate-100">{r.target_type}</span>
                  {r.reason ? ` · ${r.reason}` : ""} — {r.preview}
                </div>
                <button
                  onClick={() => act("resolve_report", r.id)}
                  disabled={busy}
                  className={`${btn} bg-white/10 text-slate-200 hover:bg-white/20`}
                >
                  Resolve
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Seeker-pin alerts */}
      <section className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">
          Seeker-pin alerts ({notifications.length})
        </h2>
        {notifications.length === 0 ? (
          <p className="text-sm text-slate-500">
            No alerts sent yet. They fire when a new trainer matches a saved
            search.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
              >
                <span className="text-slate-300">
                  <span className="text-slate-500">{n.email}</span> →{" "}
                  <Link
                    href={`/trainer/${n.trainer_slug}`}
                    className="font-medium hover:text-emerald-300"
                  >
                    {n.trainer_name}
                  </Link>
                </span>
                {statusBadge(n.sent ? "resolved" : "pending")}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recommendations */}
      <section className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">
          Recommendations ({recs.length})
        </h2>
        <ul className="space-y-2">
          {recs.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/trainer/${r.trainer_slug}`}
                    className="font-medium text-slate-100 hover:text-emerald-300"
                  >
                    {r.trainer_name}
                  </Link>
                  {statusBadge(r.status)}
                </div>
                <p className="truncate text-slate-400">{r.body}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {r.status !== "approved" && (
                  <button
                    onClick={() => act("approve_rec", r.id)}
                    disabled={busy}
                    className={`${btn} bg-emerald-600 text-white`}
                  >
                    Approve
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button
                    onClick={() => act("hide_rec", r.id)}
                    disabled={busy}
                    className={`${btn} bg-red-600 text-white`}
                  >
                    Hide
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Trainers */}
      <section className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">
          Trainers ({trainers.length})
        </h2>
        <ul className="space-y-2">
          {trainers.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400">#{t.id}</span>
                <Link
                  href={`/trainer/${t.slug}`}
                  className="font-medium text-slate-100 hover:text-emerald-300"
                >
                  {t.name}
                </Link>
                <span className="text-slate-500">{t.area_name}</span>
                {statusBadge(t.status)}
                <span className="text-xs text-slate-400">{t.rec_count} recs</span>
              </div>
              <div className="flex shrink-0 gap-1">
                {t.status === "approved" && (
                  <button
                    onClick={() => mergeTrainer(t.id, t.name)}
                    disabled={busy}
                    className={`${btn} bg-white/10 text-slate-200 hover:bg-white/20`}
                  >
                    Merge…
                  </button>
                )}
                {t.status !== "approved" && (
                  <button
                    onClick={() => act("approve_trainer", t.id)}
                    disabled={busy}
                    className={`${btn} bg-emerald-600 text-white`}
                  >
                    Approve
                  </button>
                )}
                {t.status !== "rejected" && t.status !== "merged" && (
                  <button
                    onClick={() => act("hide_trainer", t.id)}
                    disabled={busy}
                    className={`${btn} bg-red-600 text-white`}
                  >
                    Hide
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
