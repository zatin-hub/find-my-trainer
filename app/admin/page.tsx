import {
  adminListNotifications,
  adminListRecommendations,
  adminListReports,
  adminListTrainers,
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
        <h1 className="mb-4 text-xl font-bold">Moderation login</h1>
        <AdminLogin />
        <p className="mt-3 text-xs text-slate-400">
          Local default key: <code>letmein</code> (set <code>ADMIN_KEY</code> in
          production).
        </p>
      </div>
    );
  }

  return (
    <AdminDashboard
      reports={adminListReports()}
      trainers={adminListTrainers()}
      recs={adminListRecommendations()}
      notifications={adminListNotifications()}
    />
  );
}
