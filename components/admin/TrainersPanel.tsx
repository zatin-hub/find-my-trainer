"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminTrainerRow } from "@/lib/queries";
import { btn, riskBadge, statusBadge, useModerate } from "@/components/admin/shared";

export default function TrainersPanel({ trainers }: { trainers: AdminTrainerRow[] }) {
  const { act, busy } = useModerate();
  const [riskOnly, setRiskOnly] = useState(false);

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
      window.alert(r.exists ? "Profile appears to exist ✓" : "Profile NOT found ✗");
  }

  const shown = riskOnly ? trainers.filter((t) => t.fake_level !== "low") : trainers;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
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
                      {t.ig_followers != null ? ` · ${t.ig_followers} followers` : ""}
                    </span>
                  )}
                  {t.custom_activity && (
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-amber-300">
                      proposed activity: {t.custom_activity}
                    </span>
                  )}
                </div>

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
                    onClick={() => act("set_verified", t.id, { verified: !t.verified })}
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
  );
}
