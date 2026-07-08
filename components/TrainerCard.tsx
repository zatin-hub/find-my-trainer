import Link from "next/link";
import type { Trainer } from "@/lib/types";
import { formatPrice, ratingStars } from "@/lib/format";

export default function TrainerCard({ trainer: t }: { trainer: Trainer }) {
  return (
    <li className="card card-hover p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/trainer/${t.slug}`}
            className="font-semibold text-slate-100 hover:text-pink-300"
          >
            {t.name}
          </Link>
          <div className="mt-0.5 text-sm text-slate-400">
            {t.area_name} · {t.activities.map((a) => a.name).join(", ")}
          </div>
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
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="chip">
          {formatPrice(t.price_min, t.price_max, t.price_unit)}
        </span>
        {t.modes.map((m) => (
          <span key={m} className="chip-accent">
            {m.replace("_", " ")}
          </span>
        ))}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="chip ml-auto hover:border-pink-400/50 hover:text-pink-200"
          title="Open directions in Google Maps"
        >
          Directions ↗
        </a>
      </div>
    </li>
  );
}
