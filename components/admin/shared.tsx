"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FakeLevel } from "@/lib/fakescore";

// Shared admin UI atoms: moderate-action hook + status/risk badges.

export const btn = "rounded-md px-2 py-1 text-xs font-medium disabled:opacity-50";

export function useModerate() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

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

  return { act, busy };
}

export function statusBadge(status: string) {
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

export function riskBadge(level: FakeLevel, score: number) {
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
