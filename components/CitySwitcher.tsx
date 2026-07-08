"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CITIES, DEFAULT_CITY, getCity } from "@/lib/cities";

// A small landmark-ish glyph per city.
const CITY_ICON: Record<string, string> = {
  bengaluru: "🌆",
  mumbai: "🌊",
  "delhi-ncr": "🏛️",
};

export default function CitySwitcher() {
  const router = useRouter();
  const params = useSearchParams();
  const current = getCity(params.get("city") ?? DEFAULT_CITY);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function go(slug: string) {
    setOpen(false);
    router.push(`/?city=${slug}`);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm font-medium text-slate-200 transition hover:border-white/25 hover:text-white md:px-3"
      >
        <span className="truncate max-[359px]:max-w-[64px]">{current.name}</span>
        <span aria-hidden className="text-[10px] text-slate-400">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Select your city"
          className="fixed inset-x-4 top-[72px] z-50 rounded-2xl border border-white/10 bg-slate-900 p-3 shadow-2xl sm:absolute sm:inset-x-auto sm:left-0 sm:top-auto sm:mt-2 sm:w-[340px]"
        >
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
            Available cities
          </p>
          <div className="grid grid-cols-3 gap-2">
            {CITIES.map((c) => {
              const active = c.slug === current.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => go(c.slug)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition ${
                    active
                      ? "border-pink-400/50 bg-pink-500/15"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                  }`}
                >
                  <span aria-hidden className="text-2xl">
                    {CITY_ICON[c.slug] ?? "🏙️"}
                  </span>
                  <span
                    className={`text-center text-xs font-medium ${
                      active ? "text-pink-200" : "text-slate-300"
                    }`}
                  >
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
