"use client";

import type { AdminReport } from "@/lib/queries";
import { btn, useModerate } from "@/components/admin/shared";

export default function ReportsPanel({ reports }: { reports: AdminReport[] }) {
  const { act, busy } = useModerate();
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Open reports ({reports.length})</h2>
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
  );
}
