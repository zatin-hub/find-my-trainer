import type { MetadataRoute } from "next";
import { getActivities, getAreas, listTrainers } from "@/lib/queries";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [activities, areas, trainers] = await Promise.all([
    getActivities(),
    getAreas(),
    listTrainers(),
  ]);

  const urls: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, priority: 1 },
    { url: `${BASE}/activities`, priority: 0.8 },
    { url: `${BASE}/add`, priority: 0.5 },
  ];

  for (const a of activities) {
    urls.push({ url: `${BASE}/activities/${a.slug}`, priority: 0.7 });
    for (const ar of areas) {
      urls.push({
        url: `${BASE}/activities/${a.slug}/${ar.slug}`,
        priority: 0.6,
      });
    }
  }

  for (const t of trainers) {
    urls.push({ url: `${BASE}/trainer/${t.slug}`, priority: 0.6 });
  }

  return urls;
}
