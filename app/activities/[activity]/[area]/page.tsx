import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getActivityBySlug,
  getAreaBySlug,
  listTrainers,
} from "@/lib/queries";
import TrainerCard from "@/components/TrainerCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ activity: string; area: string }>;
}): Promise<Metadata> {
  const { activity, area } = await params;
  const [a, ar] = await Promise.all([
    getActivityBySlug(activity),
    getAreaBySlug(area),
  ]);
  if (!a || !ar) return { title: "Not found" };
  return {
    title: `${a.name} trainers in ${ar.name}, Bengaluru — recommendations`,
    description: `Crowdsourced ${a.name.toLowerCase()} trainers in ${ar.name}, Bengaluru. Real recommendations and real prices from people nearby.`,
  };
}

export default async function ActivityAreaPage({
  params,
}: {
  params: Promise<{ activity: string; area: string }>;
}) {
  const { activity, area } = await params;
  const [a, ar] = await Promise.all([
    getActivityBySlug(activity),
    getAreaBySlug(area),
  ]);
  if (!a || !ar) notFound();

  const trainers = await listTrainers({ activity, area });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav className="text-sm text-slate-400">
        <Link href="/activities" className="text-pink-400 hover:underline">
          Browse
        </Link>{" "}
        /{" "}
        <Link
          href={`/activities/${a.slug}`}
          className="text-pink-400 hover:underline"
        >
          {a.name}
        </Link>{" "}
        / {ar.name}
      </nav>
      <h1 className="mt-2 text-2xl font-bold text-white">
        {a.icon} {a.name} trainers in {ar.name}
      </h1>
      <p className="mt-1 text-slate-400">
        {trainers.length} trainer{trainers.length === 1 ? "" : "s"} in {ar.name},
        recommended by the community.
      </p>

      <ul className="mt-5 space-y-3">
        {trainers.map((t) => (
          <TrainerCard key={t.id} trainer={t} />
        ))}
        {trainers.length === 0 && (
          <li className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">
            No {a.name.toLowerCase()} trainers in {ar.name} yet.{" "}
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
