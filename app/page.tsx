import HomeClient from "@/components/HomeClient";
import { getActivities, getAreas, listTrainers } from "@/lib/queries";
import { getCity } from "@/lib/cities";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city: cityParam } = await searchParams;
  const city = getCity(cityParam).slug; // normalize/validate to a known city
  const [trainers, activities, areas] = await Promise.all([
    listTrainers({ city }),
    getActivities(),
    getAreas(),
  ]);
  return (
    <HomeClient
      initialTrainers={trainers}
      activities={activities}
      areas={areas}
      city={city}
    />
  );
}
