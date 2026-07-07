import { getMapConfig } from "@/lib/mapstyle";
import { getUsage } from "@/lib/usage";
import MapPanel from "@/components/admin/MapPanel";

export const dynamic = "force-dynamic";

export default async function AdminMapPage() {
  const [mapConfig, usage] = await Promise.all([getMapConfig(), getUsage(7)]);
  return (
    <MapPanel
      mapProvider={mapConfig.provider}
      olaConfigured={!!process.env.OLA_MAPS_API_KEY}
      usage={usage}
    />
  );
}
