import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  getMergedTargetSlug,
  getRecommendations,
  getTrainerBySlug,
  getVotedRecIds,
} from "@/lib/queries";
import { formatPrice, ratingStars } from "@/lib/format";
import { isOwner, claimsEnabled } from "@/lib/claim";
import RecommendForm from "@/components/RecommendForm";
import RecommendationList from "@/components/RecommendationList";
import ClaimFlow from "@/components/ClaimFlow";
import EditProfile from "@/components/EditProfile";

export const dynamic = "force-dynamic";

export default async function TrainerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // If this trainer was merged into another, redirect to the canonical profile.
  const mergedTarget = await getMergedTargetSlug(slug);
  if (mergedTarget) redirect(`/trainer/${mergedTarget}`);

  const trainer = await getTrainerBySlug(slug);
  if (!trainer) notFound();

  const recs = await getRecommendations(trainer.id);
  const owner = await isOwner(trainer.id);
  const anonId = (await cookies()).get("anon_id")?.value;
  const votedIds = await getVotedRecIds(
    anonId,
    recs.map((r) => r.id)
  );
  const prices = recs
    .filter((r) => r.price_paid)
    .map((r) => r.price_paid as number);
  const avgPaid =
    prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/" className="text-sm text-pink-400 hover:underline">
        ← Back to map
      </Link>

      <div className="card mt-3 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{trainer.name}</h1>
              {trainer.verified && (
                <span className="chip-accent">✓ Verified</span>
              )}
            </div>
            <p className="mt-1 text-slate-400">
              {trainer.area_name} ·{" "}
              {trainer.activities.map((a) => `${a.icon} ${a.name}`).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            {trainer.avg_rating ? (
              <div className="text-lg text-pink-400">
                {ratingStars(trainer.avg_rating)}
              </div>
            ) : (
              <div className="text-slate-500">No rating yet</div>
            )}
            <div className="text-sm text-slate-500">
              {trainer.rec_count} recommendation
              {trainer.rec_count === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {trainer.bio && <p className="mt-4 text-slate-300">{trainer.bio}</p>}

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="chip">
            {formatPrice(trainer.price_min, trainer.price_max, trainer.price_unit)}
          </span>
          {trainer.modes.map((m) => (
            <span key={m} className="chip-accent">
              {m.replace("_", " ")}
            </span>
          ))}
          {trainer.languages.map((l) => (
            <span key={l} className="chip">
              {l}
            </span>
          ))}
        </div>

        {avgPaid && (
          <div className="mt-4 rounded-xl border border-pink-400/20 bg-pink-400/10 px-4 py-3 text-sm text-pink-200">
            💸 Real average paid by people here:{" "}
            <strong>₹{avgPaid.toLocaleString("en-IN")}</strong>{" "}
            <span className="text-pink-300/80">
              (from {prices.length} recommendation{prices.length === 1 ? "" : "s"})
            </span>
          </div>
        )}

        {trainer.contact_instagram && (
          <p className="mt-4 text-sm text-slate-400">
            Instagram:{" "}
            <a
              href={`https://instagram.com/${trainer.contact_instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:underline"
            >
              @{trainer.contact_instagram}
            </a>
          </p>
        )}
        {trainer.claimed && trainer.contact_phone && (
          <p className="mt-1 text-sm text-slate-400">
            Phone:{" "}
            <a
              href={`tel:${trainer.contact_phone}`}
              className="text-pink-400 hover:underline"
            >
              {trainer.contact_phone}
            </a>
          </p>
        )}
        {!trainer.claimed && (
          <p className="mt-2 text-xs text-slate-500">
            Phone numbers are shown only after a trainer claims and consents — we
            never publish private contact details or sell your data.
          </p>
        )}

        {/* Ownership controls */}
        {(owner || claimsEnabled()) && (
          <div className="mt-4 border-t border-white/10 pt-4">
            {owner ? (
              <div>
                <p className="mb-2 text-sm font-medium text-pink-400">
                  ✓ You manage this profile
                </p>
                <EditProfile trainer={trainer} />
              </div>
            ) : (
              <ClaimFlow trainerSlug={trainer.slug} />
            )}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">What people say</h2>
          <RecommendForm trainerSlug={trainer.slug} />
        </div>
        <RecommendationList
          recs={recs}
          votedIds={votedIds}
          isOwner={owner}
          trainerSlug={trainer.slug}
        />
      </div>
    </div>
  );
}
