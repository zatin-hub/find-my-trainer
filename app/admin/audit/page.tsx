import { adminListAudit } from "@/lib/queries";
import AuditPanel from "@/components/admin/AuditPanel";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const audit = await adminListAudit();
  return <AuditPanel audit={audit} />;
}
