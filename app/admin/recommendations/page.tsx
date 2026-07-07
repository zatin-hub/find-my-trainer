import { adminListRecommendations } from "@/lib/queries";
import RecsPanel from "@/components/admin/RecsPanel";

export const dynamic = "force-dynamic";

export default async function AdminRecsPage() {
  const recs = await adminListRecommendations();
  return <RecsPanel recs={recs} />;
}
