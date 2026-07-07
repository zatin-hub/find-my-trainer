import Link from "next/link";
import type { Metadata } from "next";
import { getActivities, getAreas } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse fitness trainers by activity & area in Bengaluru",
  description:
    "Find crowdsourced, honestly-rated fitness trainers across Bengaluru — gym, yoga, Zumba, swimming, boxing and more, by neighbourhood.",
};

export default async function ActivitiesIndex() {
  const [activities, areas] = await Promise.all([getActivities(), getAreas()]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/" className="text-sm text-pink-400 hover:underline">
        ← Back to map
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-white">
        Browse trainers in Bengaluru
      </h1>
      <p className="mt-1 text-slate-400">
        Pick an activity, then a neighbourhood — recommendations come from real
        people, not ads.
      </p>

      <h2 className="mt-6 mb-2 text-lg font-semibold text-slate-200">
        By activity
      </h2>
      <div className="flex flex-wrap gap-2">
        {activities.map((a) => (
          <Link
            key={a.id}
            href={`/activities/${a.slug}`}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:border-pink-400/50 hover:text-pink-300"
          >
            {a.icon} {a.name}
          </Link>
        ))}
      </div>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-slate-200">By area</h2>
      <div className="flex flex-wrap gap-2">
        {areas.map((ar) => (
          <Link
            key={ar.id}
            href={`/?area=${ar.slug}`}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:border-pink-400/50 hover:text-pink-300"
          >
            {ar.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
