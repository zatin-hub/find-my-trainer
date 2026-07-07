"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  AdminAuditRow,
  AdminNotification,
  AdminRecRow,
  AdminReport,
  AdminStats,
  AdminTrainerRow,
} from "@/lib/queries";
import type { FakeLevel } from "@/lib/fakescore";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    approved: "bg-pink-400/10 text-pink-300 border border-pink-400/20",
    pending: "bg-amber-400/10 text-amber-300 border border-amber-400/20",
    rejected: "bg-rose-500/10 text-rose-300 border border-rose-400/20",
    merged: "bg-white/10 text-slate-400 border border-white/10",
    open: "bg-pink-400/10 text-pink-300 border border-pink-400/20",
    resolved: "bg-white/5 text-slate-500 border border-white/10",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${map[status] ?? "bg-white/10"}`}>
      {status}
    </span>
  );
}

function riskBadge(level: FakeLevel, score: number) {
  const map: Record<FakeLevel, string> = {
    low: "bg-emerald-500/10 text-emerald-300 border border-emerald-400/20",
    medium: "bg-amber-400/10 text-amber-300 border border-amber-400/20",
    high: "bg-rose-500/15 text-rose-300 border border-rose-400/30",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[level]}`}>
      risk {score}
    </span>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className={`text-2xl font-bold ${tone ?? "text-white"}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

export default function AdminDashboard({
  stats,
  reports,
  trainers,
  recs,
  notifications,
  audit,
}: {
  stats: AdminStats;
  reports: AdminReport[];
  trainers: AdminTrainerRow[];
  recs: AdminRecRow[];
  notifications: AdminNotification[];
  audit: AdminAuditRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  // Default to surfacing suspicious entries (already sorted risk-first server-side).
  const [riskOnly, setRiskOnly] = useState(false);

  async function act(
    action: string,
    id: number,
    extra?: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    setBusy(true);
    let json: Record<string, unknown> | null = null;
    try {
      const res = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, ...extra }),
      });
      json = await res.json().catch(() => null);
    } finally {
      setBusy(false);
    }
    router.refresh();
    return json;
  }

  function mergeTrainer(id: number, name: string) {
    const into = window.prompt(
      `Merge "${name}" INTO which trainer? Enter the target trainer's numeric id (its recommendations move to the target; this one is hidden).`
    );
    const intoId = Number(into);
    if (!Number.isInteger(intoId) || intoId === id) return;
    act("merge_trainer", id, { into_id: intoId });
  }

  function deleteTrainer(id: number, name: string) {
    if (
      window.confirm(
        `Permanently DELETE "${name}" and all its recommendations? This cannot be undone. Use Hide instead to keep a record.`
      )
    )
      act("delete_trainer", id);
  }

  async function verifyIg(id: number) {
    const json = await act("verify_instagram", id);
    const r = json?.result as
      | { checked: boolean; exists?: boolean; note?: string }
      | undefined;
    if (!r) return;
    if (!r.checked)
      window.alert(
        `Couldn't auto-check (${r.note ?? "blocked"}). Open the profile and verify manually.`
      );
    else
      window.alert(
        r.exists ? "Profile appears to exist ✓" : "Profile NOT found ✗"
      );
  }

  const btn = "rounded-md px-2 py-1 text-xs font-medium disabled:opacity-50";
  const shown = riskOnly
    ? trainers.filter((t) => t.fake_level !== "low")
    : trainers;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Moderation</h1>
        <Link href="/" className="text-sm text-pink-400 hover:underline">
          ← Site
        </Link>
      </div>

      {/* Overview */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Trainers" value={stats.trainers_total} />
        <StatCard label="Approved" value={stats.trainers_approved} tone="text-emerald-300" />
        <StatCard label="Verified" value={stats.trainers_verified} tone="text-pink-300" />
        <StatCard label="Pending" value={stats.trainers_pending} tone="text-amber-300" />
        <StatCard label="Rejected" value={stats.trainers_rejected} tone="text-rose-300" />
        <StatCard label="Recommendations" value={stats.recs_total} />
        <StatCard label="Recs pending" value={stats.recs_pending} tone="text-amber-300" />
        <StatCard label="Open reports" value={stats.reports_open} tone="text-rose-300" />
      </section>

      {/* Reports */}
      <section className="mt-8">
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
                className="flex items-center justify-between gap-3 rounded-lg border border-pink-400/20 bg-pink-400/[0.07] p-3 text-sm"
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

      {/* Trainers */}
      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Trainers ({shown.length}) — sorted by risk
          </h2>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={riskOnly}
              onChange={(e) => setRiskOnly(e.target.checked)}
              className="accent-rose-500"
            />
            Flagged only
          </label>
        </div>
        <ul className="space-y-2">
          {shown.map((t) => (
            <li
              key={t.id}
              className={`rounded-lg border p-3 text-sm ${
                t.fake_level === "high"
                  ? "border-rose-400/30 bg-rose-500/[0.06]"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">#{t.id}</span>
                    <Link
                      href={`/trainer/${t.slug}`}
                      className="font-medium text-slate-100 hover:text-pink-300"
                    >
                      {t.name}
                    </Link>
                    <span className="text-slate-500">{t.area_name}</span>
                    {statusBadge(t.status)}
                    {riskBadge(t.fake_level, t.fake_score)}
                    {t.verified ? (
                      <span className="rounded-full border border-pink-400/20 bg-pink-400/10 px-2 py-0.5 text-xs text-pink-300">
                        ✓ verified
                      </span>
                    ) : null}
                    <span className="text-xs text-slate-400">{t.rec_count} recs</span>
                  </div>

                  {/* Instagram */}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {t.contact_instagram ? (
                      <a
                        href={`https://instagram.com/${t.contact_instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-300 hover:underline"
                      >
                        @{t.contact_instagram} ↗
                      </a>
                    ) : (
                      <span className="text-rose-300">no instagram</span>
                    )}
                    {t.ig_checked_at && (
                      <span className="text-slate-500">
                        {t.ig_exists === 1
                          ? "· exists ✓"
                          : t.ig_exists === 0
                            ? "· not found ✗"
                            : "· check inconclusive"}
                        {t.ig_followers != null
                          ? ` · ${t.ig_followers} followers`
                          : ""}
                      </span>
                    )}
                    {t.custom_activity && (
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-amber-300">
                        proposed activity: {t.custom_activity}
                      </span>
                    )}
                  </div>

                  {/* Why flagged */}
                  {t.fake_reasons.length > 0 && (
                    <p className="mt-1 text-xs text-slate-400">
                      {t.fake_reasons.join(" · ")}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="flex gap-1">
                    {t.contact_instagram && (
                      <button
                        onClick={() => verifyIg(t.id)}
                        disabled={busy}
                        className={`${btn} bg-white/10 text-slate-200 hover:bg-white/20`}
                      >
                        Check IG
                      </button>
                    )}
                    <button
                      onClick={() =>
                        act("set_verified", t.id, { verified: !t.verified })
                      }
                      disabled={busy}
                      className={`${btn} ${
                        t.verified
                          ? "bg-white/10 text-slate-200 hover:bg-white/20"
                          : "bg-pink-600 text-white"
                      }`}
                    >
                      {t.verified ? "Unverify" : "Verify"}
                    </button>
                  </div>
                  <div className="flex gap-1">
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
                        className={`${btn} bg-pink-600 text-white`}
                      >
                        Approve
                      </button>
                    )}
                    {t.status !== "rejected" && t.status !== "merged" && (
                      <button
                        onClick={() => act("hide_trainer", t.id)}
                        disabled={busy}
                        className={`${btn} bg-amber-600/80 text-white`}
                      >
                        Hide
                      </button>
                    )}
                    <button
                      onClick={() => deleteTrainer(t.id, t.name)}
                      disabled={busy}
                      className={`${btn} bg-red-600 text-white`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
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
                    className="font-medium text-slate-100 hover:text-pink-300"
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
                    className={`${btn} bg-pink-600 text-white`}
                  >
                    Approve
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button
                    onClick={() => act("hide_rec", r.id)}
                    disabled={busy}
                    className={`${btn} bg-amber-600/80 text-white`}
                  >
                    Hide
                  </button>
                )}
                <button
                  onClick={() =>
                    window.confirm("Permanently delete this recommendation?") &&
                    act("delete_rec", r.id)
                  }
                  disabled={busy}
                  className={`${btn} bg-red-600 text-white`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
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
                    className="font-medium hover:text-pink-300"
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

      {/* Audit log */}
      <section className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">
          Audit log ({audit.length})
        </h2>
        {audit.length === 0 ? (
          <p className="text-sm text-slate-500">No admin actions yet.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {audit.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5"
              >
                <span className="text-slate-300">
                  <span className="font-mono text-slate-200">{a.action}</span>{" "}
                  <span className="text-slate-500">
                    {a.target_type} #{a.target_id}
                  </span>
                  {a.detail ? (
                    <span className="text-slate-400"> — {a.detail}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-slate-600">{a.created_at}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
