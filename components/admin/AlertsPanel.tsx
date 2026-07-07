"use client";

import Link from "next/link";
import type { AdminNotification } from "@/lib/queries";
import { statusBadge } from "@/components/admin/shared";

export default function AlertsPanel({
  notifications,
}: {
  notifications: AdminNotification[];
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">
        Seeker-pin alerts ({notifications.length})
      </h2>
      {notifications.length === 0 ? (
        <p className="text-sm text-slate-500">
          No alerts sent yet. They fire when a new trainer matches a saved search.
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
  );
}
