import Link from "next/link";
import { adminListAudit, adminStats } from "@/lib/queries";
import AuditPanel from "@/components/admin/AuditPanel";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-white/20">
      <div className={`text-2xl font-bold ${tone ?? "text-white"}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function AdminOverview() {
  const [stats, audit] = await Promise.all([adminStats(), adminListAudit()]);
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Trainers" value={stats.trainers_total} href="/admin/trainers" />
          <StatCard
            label="Approved"
            value={stats.trainers_approved}
            tone="text-emerald-300"
            href="/admin/trainers"
          />
          <StatCard
            label="Verified"
            value={stats.trainers_verified}
            tone="text-pink-300"
            href="/admin/trainers"
          />
          <StatCard
            label="Pending trainers"
            value={stats.trainers_pending}
            tone="text-amber-300"
            href="/admin/trainers"
          />
          <StatCard
            label="Rejected"
            value={stats.trainers_rejected}
            tone="text-rose-300"
            href="/admin/trainers"
          />
          <StatCard
            label="Recommendations"
            value={stats.recs_total}
            href="/admin/recommendations"
          />
          <StatCard
            label="Recs pending"
            value={stats.recs_pending}
            tone="text-amber-300"
            href="/admin/recommendations"
          />
          <StatCard
            label="Open reports"
            value={stats.reports_open}
            tone="text-rose-300"
            href="/admin/reports"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent activity</h2>
        <AuditPanel audit={audit.slice(0, 8)} />
      </section>
    </div>
  );
}
