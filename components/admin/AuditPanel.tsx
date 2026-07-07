"use client";

import type { AdminAuditRow } from "@/lib/queries";

export default function AuditPanel({ audit }: { audit: AdminAuditRow[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Audit log ({audit.length})</h2>
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
                {a.detail ? <span className="text-slate-400"> — {a.detail}</span> : null}
              </span>
              <span className="shrink-0 text-slate-600">{a.created_at}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
