import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { adminStats } from "@/lib/queries";
import AdminLogin from "@/components/AdminLogin";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const stats = await adminStats();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Admin</h1>
        <Link href="/" className="text-sm text-pink-400 hover:underline">
          ← Site
        </Link>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <AdminNav
          badges={{
            reports: stats.reports_open,
            pendingRecs: stats.recs_pending,
            pendingTrainers: stats.trainers_pending,
          }}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
