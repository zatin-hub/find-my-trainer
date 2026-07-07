import { adminListTrainers } from "@/lib/queries";
import TrainersPanel from "@/components/admin/TrainersPanel";

export const dynamic = "force-dynamic";

export default async function AdminTrainersPage() {
  const trainers = await adminListTrainers();
  return <TrainersPanel trainers={trainers} />;
}
