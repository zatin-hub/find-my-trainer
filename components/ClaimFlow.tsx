"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimFlow({ trainerSlug }: { trainerSlug: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "contact" | "otp">("idle");
  const [method, setMethod] = useState("email");
  const [value, setValue] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/claims/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trainer: trainerSlug,
        contact_method: method,
        contact_value: value,
      }),
    });
    setBusy(false);
    const d = await res.json();
    if (res.ok) {
      setDevOtp(d.devOtp ?? null);
      setStep("otp");
    } else setError(d.error || "Something went wrong");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/claims/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainer: trainerSlug, otp }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError((await res.json()).error || "Invalid code");
  }

  if (step === "idle")
    return (
      <button
        onClick={() => setStep("contact")}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-700"
      >
        Is this you? Claim profile
      </button>
    );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {step === "contact" && (
        <form onSubmit={start} className="space-y-2">
          <p className="text-sm font-medium">Verify it&apos;s you</p>
          <p className="text-xs text-slate-500">
            We&apos;ll send a one-time code to confirm ownership.
          </p>
          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={method === "email" ? "you@email.com" : "Phone number"}
              className={input}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
            <button
              type="button"
              onClick={() => setStep("idle")}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={verify} className="space-y-2">
          <p className="text-sm font-medium">Enter the 6-digit code</p>
          {devOtp && (
            <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
              Dev mode (no email configured): your code is{" "}
              <strong>{devOtp}</strong>
            </p>
          )}
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            className={input}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Verify & claim"}
            </button>
            <button
              type="button"
              onClick={() => setStep("idle")}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
