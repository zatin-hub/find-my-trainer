import Link from "next/link";
import { getActivities, getAreas } from "@/lib/queries";
import AddTrainerForm from "@/components/AddTrainerForm";

export const dynamic = "force-dynamic";

export default function AddPage() {
  const activities = getActivities();
  const areas = getAreas();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/" className="text-sm text-emerald-400 hover:underline">
        ← Back to map
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-white">Recommend a trainer</h1>
      <p className="mt-1 text-slate-400">
        Add a trainer you&apos;ve worked with and tell others why. No account
        needed — it&apos;s anonymous.
      </p>
      <div className="mt-5">
        <AddTrainerForm activities={activities} areas={areas} />
      </div>
    </div>
  );
}
