"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Trainer } from "@/lib/types";

export default function EditProfile({ trainer }: { trainer: Trainer }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bio, setBio] = useState(trainer.bio ?? "");
  const [instagram, setInstagram] = useState(trainer.contact_instagram ?? "");
  const [phone, setPhone] = useState(trainer.contact_phone ?? "");
  const [priceMin, setPriceMin] = useState(trainer.price_min?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(trainer.price_max?.toString() ?? "");
  const [priceUnit, setPriceUnit] = useState<string>(
    trainer.price_unit ?? "per_month"
  );
  const [busy, setBusy] = useState(false);

  const input = "input";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/trainers/${trainer.slug}/edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bio,
        contact_instagram: instagram || undefined,
        contact_phone: phone || undefined,
        price_min: priceMin || undefined,
        price_max: priceMax || undefined,
        price_unit: priceUnit,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn-outline">
        ✎ Edit profile
      </button>
    );

  return (
    <form onSubmit={save} className="card mt-3 space-y-2 p-4">
      <label className="block text-sm font-medium text-slate-300">Bio</label>
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className={input} />
      <div className="grid grid-cols-2 gap-2">
        <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Instagram @handle" className={input} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (shown publicly)" className={input} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="Price from ₹" className={input} />
        <input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="Price to ₹" className={input} />
        <select value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)} className={input}>
          <option value="per_month">/month</option>
          <option value="per_session">/session</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button disabled={busy} className="btn-primary px-3 py-1.5">
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-3 py-1.5">
          Cancel
        </button>
      </div>
    </form>
  );
}
