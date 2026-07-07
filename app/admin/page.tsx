import {
  adminListNotifications,
  adminListRecommendations,
  adminListReports,
  adminListTrainers,
  adminListAudit,
  adminStats,
} from "@/lib/queries";
import { isAdmin } from "@/lib/admin";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false } };

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="mb-4 text-xl font-bold text-white">Moderation login</h1>
        <AdminLogin />
        <p className="mt-3 text-xs text-slate-500">
          Local default key: <code className="text-slate-300">letmein</code> (set{" "}
          <code className="text-slate-300">ADMIN_KEY</code> in production).
        </p>
      </div>
    );
  }

  const [stats, reports, trainers, recs, notifications, audit] =
    await Promise.all([
      adminStats(),
      adminListReports(),
      adminListTrainers(),
      adminListRecommendations(),
      adminListNotifications(),
      adminListAudit(),
    ]);
  return (
    <AdminDashboard
      stats={stats}
      reports={reports}
      trainers={trainers}
      recs={recs}
      notifications={notifications}
      audit={audit}
    />
  );
}
