import Link from "next/link";
import type { Metadata } from "next";
import { getActivities, getAreas } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse fitness trainers by activity & area in Bengaluru",
  description:
    "Find crowdsourced, honestly-rated fitness trainers across Bengaluru — gym, yoga, Zumba, swimming, boxing and more, by neighbourhood.",
};

export default function ActivitiesIndex() {
  const activities = getActivities();
  const areas = getAreas();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/" className="text-sm text-emerald-700 hover:underline">
        ← Back to map
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Browse trainers in Bengaluru</h1>
      <p className="mt-1 text-slate-500">
        Pick an activity, then a neighbourhood — recommendations come from real
        people, not ads.
      </p>

      <h2 className="mt-6 mb-2 text-lg font-semibold">By activity</h2>
      <div className="flex flex-wrap gap-2">
        {activities.map((a) => (
          <Link
            key={a.id}
            href={`/activities/${a.slug}`}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm hover:border-emerald-500 hover:text-emerald-700"
          >
            {a.icon} {a.name}
          </Link>
        ))}
      </div>

      <h2 className="mt-8 mb-2 text-lg font-semibold">By area</h2>
      <div className="flex flex-wrap gap-2">
        {areas.map((ar) => (
          <Link
            key={ar.id}
            href={`/?area=${ar.slug}`}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm hover:border-emerald-500 hover:text-emerald-700"
          >
            {ar.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
