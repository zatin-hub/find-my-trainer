"use client";

import Link from "next/link";
import type { Trainer } from "@/lib/types";
import { formatPrice, ratingStars } from "@/lib/format";

/** Inline profile panel shown in the home list column when a map pin is
 *  clicked. Back returns to the full list (Esc works too — see HomeClient). */
export default function TrainerDetail({
  trainer: t,
  onBack,
}: {
  trainer: Trainer;
  onBack: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-pink-300"
      >
        <span aria-hidden>←</span> All trainers
      </button>

      <div className="card border-pink-400/40 p-5 ring-2 ring-pink-500/20">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-lg font-semibold text-slate-100">
                {t.name}
              </h2>
              {t.verified && <span className="chip-accent shrink-0">✓ Verified</span>}
            </div>
            <p className="mt-0.5 text-sm text-slate-400">
              {t.area_name} ·{" "}
              {t.activities.map((a) => `${a.icon} ${a.name}`).join(" · ")}
            </p>
          </div>
          <div className="shrink-0 text-right text-sm">
            {t.avg_rating ? (
              <div className="text-pink-400">{ratingStars(t.avg_rating)}</div>
            ) : (
              <div className="text-slate-500">No rating yet</div>
            )}
            <div className="text-xs text-slate-500">
              {t.rec_count} rec{t.rec_count === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {t.bio && <p className="mt-3 text-sm leading-relaxed text-slate-300">{t.bio}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="chip">
            {formatPrice(t.price_min, t.price_max, t.price_unit)}
          </span>
          {t.modes.map((m) => (
            <span key={m} className="chip-accent">
              {m.replace("_", " ")}
            </span>
          ))}
        </div>

        {t.languages.length > 0 && (
          <div className="mt-2 text-xs text-slate-500">
            🗣 {t.languages.join(", ")}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/trainer/${t.slug}`} className="btn-primary text-sm">
            View full profile
          </Link>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="chip text-sm hover:border-pink-400/50 hover:text-pink-200"
          >
            Directions ↗
          </a>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Tip: press Esc or click the map background to go back.
      </p>
    </div>
  );
}
