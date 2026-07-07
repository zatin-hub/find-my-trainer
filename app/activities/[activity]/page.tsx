import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getActivityBySlug,
  getAreas,
  listTrainers,
} from "@/lib/queries";
import TrainerCard from "@/components/TrainerCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ activity: string }>;
}): Promise<Metadata> {
  const { activity } = await params;
  const a = await getActivityBySlug(activity);
  if (!a) return { title: "Not found" };
  return {
    title: `${a.name} trainers in Bengaluru — crowdsourced recommendations`,
    description: `Find honestly-rated ${a.name.toLowerCase()} trainers across Bengaluru, recommended by real people. No spam, no ads.`,
  };
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ activity: string }>;
}) {
  const { activity } = await params;
  const a = await getActivityBySlug(activity);
  if (!a) notFound();

  const [trainers, areas] = await Promise.all([
    listTrainers({ activity }),
    getAreas(),
  ]);
  // Only show areas that actually have trainers for this activity.
  const areasWithCount = areas
    .map((ar) => ({
      ...ar,
      count: trainers.filter((t) => t.area_name === ar.name).length,
    }))
    .filter((ar) => ar.count > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav className="text-sm text-slate-400">
        <Link href="/activities" className="text-pink-400 hover:underline">
          Browse
        </Link>{" "}
        / {a.name}
      </nav>
      <h1 className="mt-2 text-2xl font-bold text-white">
        {a.icon} {a.name} trainers in Bengaluru
      </h1>
      <p className="mt-1 text-slate-400">
        {trainers.length} trainer{trainers.length === 1 ? "" : "s"} recommended by
        the community.
      </p>

      {areasWithCount.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {areasWithCount.map((ar) => (
            <Link
              key={ar.id}
              href={`/activities/${a.slug}/${ar.slug}`}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-slate-300 transition hover:border-pink-400/50 hover:text-pink-300"
            >
              {ar.name} ({ar.count})
            </Link>
          ))}
        </div>
      )}

      <ul className="mt-5 space-y-3">
        {trainers.map((t) => (
          <TrainerCard key={t.id} trainer={t} />
        ))}
        {trainers.length === 0 && (
          <li className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">
            No {a.name.toLowerCase()} trainers yet.{" "}
            <Link href="/add" className="font-medium text-pink-400 underline">
              Recommend one
            </Link>
            .
          </li>
        )}
      </ul>
    </div>
  );
}
