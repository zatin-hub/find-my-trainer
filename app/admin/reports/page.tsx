import { adminListReports } from "@/lib/queries";
import ReportsPanel from "@/components/admin/ReportsPanel";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const reports = await adminListReports();
  return <ReportsPanel reports={reports} />;
}
