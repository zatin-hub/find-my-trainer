"use client";

import Link from "next/link";
import type { AdminRecRow } from "@/lib/queries";
import { btn, statusBadge, useModerate } from "@/components/admin/shared";

export default function RecsPanel({ recs }: { recs: AdminRecRow[] }) {
  const { act, busy } = useModerate();
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Recommendations ({recs.length})</h2>
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
        {recs.length === 0 && (
          <li className="text-sm text-slate-500">No recommendations yet.</li>
        )}
      </ul>
    </section>
  );
}
