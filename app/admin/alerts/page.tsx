import { adminListNotifications } from "@/lib/queries";
import AlertsPanel from "@/components/admin/AlertsPanel";

export const dynamic = "force-dynamic";

export default async function AdminAlertsPage() {
  const notifications = await adminListNotifications();
  return <AlertsPanel notifications={notifications} />;
}
