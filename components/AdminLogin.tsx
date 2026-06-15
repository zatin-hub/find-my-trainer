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
        className="input"
      />
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button disabled={busy} className="btn-primary w-full">
        {busy ? "…" : "Sign in"}
      </button>
    </form>
  );
}
