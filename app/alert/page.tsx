import Link from "next/link";
import { getActivities, getAreas } from "@/lib/queries";
import MatchAlertForm from "@/components/MatchAlertForm";

export const dynamic = "force-dynamic";

export default async function AlertPage() {
  const [activities, areas] = await Promise.all([getActivities(), getAreas()]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/" className="text-sm text-pink-400 hover:underline">
        ← Back to map
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-white">Get a match alert</h1>
      <p className="mt-1 text-slate-400">
        Tell us what you&apos;re looking for and we&apos;ll email you the moment a
        matching trainer is added nearby. No account needed.
      </p>
      <div className="mt-5">
        <MatchAlertForm activities={activities} areas={areas} />
      </div>
    </div>
  );
}
