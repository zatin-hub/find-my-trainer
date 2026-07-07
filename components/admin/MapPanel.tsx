"use client";

import type { UsageDay } from "@/lib/usage";
import { useModerate } from "@/components/admin/shared";

export default function MapPanel({
  mapProvider,
  olaConfigured,
  usage,
}: {
  mapProvider: "hybrid" | "ola";
  olaConfigured: boolean;
  usage: UsageDay[];
}) {
  const { act, busy } = useModerate();

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Map tiles provider</h2>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
        {(
          [
            ["hybrid", "Hybrid — OpenFreeMap tiles + Ola search (free, unmetered)"],
            ["ola", "All Ola — Ola tiles + Ola search (POI labels, metered 5M/mo)"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name="map_provider"
              checked={mapProvider === value}
              disabled={busy || (value === "ola" && !olaConfigured)}
              onChange={async () => {
                const json = await act("set_map_provider", 0, { value });
                if (json?.error) window.alert(String(json.error));
              }}
              className="accent-pink-500"
            />
            <span className={mapProvider === value ? "text-pink-200" : "text-slate-300"}>
              {label}
            </span>
          </label>
        ))}
        {!olaConfigured && (
          <span className="text-xs text-amber-300">
            OLA_MAPS_API_KEY not set — All-Ola disabled
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Applies on next page load for all visitors. Switch back anytime; changes
        are audit-logged.
      </p>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-300">
          Ola usage — last 7 days (self-measured)
        </h3>
        {usage.length === 0 ? (
          <p className="text-xs text-slate-500">
            No usage recorded yet. Counters fill as maps load and searches run.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.04] text-slate-400">
                <tr>
                  {[
                    "Day",
                    "Ola tiles",
                    "Ola geocode",
                    "OSM geocode",
                    "Cache hits",
                    "Cache rate",
                    "Ola total",
                  ].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usage.map(({ day, counts }) => {
                  const tiles = counts.ola_tile ?? 0;
                  const olaGeo = counts.geocode_fwd_ola ?? 0;
                  const osmGeo =
                    (counts.geocode_fwd_photon ?? 0) +
                    (counts.geocode_fwd_nominatim ?? 0);
                  const hits =
                    (counts.geocode_fwd_cache ?? 0) + (counts.geocode_rev_cache ?? 0);
                  const live =
                    olaGeo +
                    (counts.geocode_fwd_photon ?? 0) +
                    (counts.geocode_rev_live ?? 0);
                  const rate =
                    hits + live > 0 ? Math.round((hits / (hits + live)) * 100) : 0;
                  const olaTotal = tiles + olaGeo;
                  return (
                    <tr key={day} className="border-t border-white/5 text-slate-300">
                      <td className="px-3 py-1.5 font-mono">{day}</td>
                      <td className="px-3 py-1.5">{tiles}</td>
                      <td className="px-3 py-1.5">{olaGeo}</td>
                      <td className="px-3 py-1.5">{osmGeo}</td>
                      <td className="px-3 py-1.5">{hits}</td>
                      <td className="px-3 py-1.5">{rate}%</td>
                      <td className="px-3 py-1.5 font-medium text-pink-200">{olaTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-1 text-xs text-slate-500">
          Free tier: 5,000,000 calls/mo per API. Tile counts come from a client
          beacon (batched), so treat as a close estimate; the Ola console is the
          billing source of truth.
        </p>
      </div>
    </section>
  );
}
