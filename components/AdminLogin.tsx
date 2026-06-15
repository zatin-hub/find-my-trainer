"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError("Wrong key");
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Admin key"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={busy}
        className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {busy ? "…" : "Sign in"}
      </button>
    </form>
  );
}
