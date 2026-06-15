import HomeClient from "@/components/HomeClient";
import { getActivities, getAreas, listTrainers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function Home() {
  const trainers = listTrainers();
  const activities = getActivities();
  const areas = getAreas();
  return (
    <HomeClient
      initialTrainers={trainers}
      activities={activities}
      areas={areas}
    />
  );
}
