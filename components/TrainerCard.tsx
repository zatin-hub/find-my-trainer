import Link from "next/link";
import type { Trainer } from "@/lib/types";
import { formatPrice, ratingStars } from "@/lib/format";

export default function TrainerCard({ trainer: t }: { trainer: Trainer }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/trainer/${t.slug}`}
            className="font-semibold hover:text-emerald-700"
          >
            {t.name}
          </Link>
          <div className="mt-0.5 text-sm text-slate-500">
            {t.area_name} · {t.activities.map((a) => a.name).join(", ")}
          </div>
        </div>
        <div className="shrink-0 text-right text-sm">
          {t.avg_rating ? (
            <div className="text-amber-500">{ratingStars(t.avg_rating)}</div>
          ) : (
            <div className="text-slate-400">No rating yet</div>
          )}
          <div className="text-xs text-slate-500">
            {t.rec_count} rec{t.rec_count === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
          {formatPrice(t.price_min, t.price_max, t.price_unit)}
        </span>
        {t.modes.map((m) => (
          <span
            key={m}
            className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700"
          >
            {m.replace("_", " ")}
          </span>
        ))}
      </div>
    </li>
  );
}
