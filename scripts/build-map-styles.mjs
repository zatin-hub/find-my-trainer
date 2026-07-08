// Regenerates the self-hosted map styles in public/ from the upstream
// OpenFreeMap styles. Run after upstream style changes or to tweak colors:
//   node scripts/build-map-styles.mjs
//
// fmt-dark  — OFM dark + POI dots/names, park & grass greens (upstream dark
//             paints them gray / not at all), navy water, readable labels.
// fmt-bright — OFM bright (already has POI icons + full street labels) + a
//             gap-filling POI label layer at deep zoom so small businesses
//             show like they do on fmt-dark. Collision detection keeps it
//             from double-labeling POIs the native layers already placed.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

// Transit/infrastructure classes read as clutter in dense Indian cities.
const poiClassOk = [
  "!",
  [
    "in",
    ["get", "class"],
    ["literal", ["bus", "railway", "entrance", "information", "aerialway", "harbor", "campsite"]],
  ],
];
const poiName = ["coalesce", ["get", "name:latin"], ["get", "name"]];

function poiTextLayer(id, { minzoom, maxzoom, rankMax, color, halo }) {
  return {
    id,
    type: "symbol",
    source: "openmaptiles",
    "source-layer": "poi",
    minzoom,
    ...(maxzoom ? { maxzoom } : {}),
    filter: [
      "all",
      poiClassOk,
      ["has", "name"],
      ...(rankMax ? [["<=", ["get", "rank"], rankMax]] : []),
    ],
    layout: {
      "text-field": poiName,
      "text-font": ["Noto Sans Regular"],
      "text-size": 10.5,
      "text-anchor": "top",
      "text-offset": [0, 0.5],
      "text-max-width": 8,
    },
    paint: {
      "text-color": color,
      "text-halo-color": halo,
      "text-halo-width": 1.1,
    },
  };
}

async function fetchStyle(name) {
  const res = await fetch(`https://tiles.openfreemap.org/styles/${name}`);
  if (!res.ok) throw new Error(`fetch ${name}: ${res.status}`);
  return res.json();
}

// ---------- fmt-dark ----------
function buildDark(style) {
  style.name = "fmt-dark";
  const byId = Object.fromEntries(style.layers.map((l) => [l.id, l]));

  // Water → navy, clearly visible on the near-black background.
  byId.water.paint["fill-color"] = "rgb(22,34,62)";
  byId.waterway.paint["line-color"] = "rgb(36,50,82)";
  byId.water_name.paint["text-color"] = "rgba(110,140,196,0.95)";
  byId.water_name.paint["text-halo-color"] = "rgba(0,0,0,0.8)";

  // Greens. Upstream dark paints landuse parks gray, drops the `park`
  // source-layer entirely (Cubbon Park etc. live there) and has no grass.
  byId.landuse_park.paint["fill-color"] = "rgb(26,44,34)";
  const wood = byId.landcover_wood;
  delete wood.paint["fill-pattern"]; // pattern would override the color
  wood.paint["fill-color"] = "rgb(24,42,33)";
  wood.paint["fill-opacity"] = 0.7;
  const parkIdx = style.layers.findIndex((l) => l.id === "landuse_park");
  style.layers.splice(
    parkIdx,
    0,
    {
      id: "park",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      paint: { "fill-color": "rgb(26,44,34)" },
    },
    {
      id: "landcover_grass",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["==", ["get", "class"], "grass"],
      paint: { "fill-color": "rgb(24,42,33)", "fill-opacity": 0.6 },
    }
  );

  // Brighter street/place labels (stock dark is close to unreadable).
  byId.highway_name_other.paint["text-color"] = "rgba(148,152,164,1)";
  byId.highway_name_motorway.paint["text-color"] = "rgb(150,154,166)";
  for (const id of ["place_other", "place_suburb", "place_village", "place_town"])
    byId[id].paint["text-color"] = "rgb(156,160,172)";
  for (const id of ["place_city", "place_city_large"])
    byId[id].paint["text-color"] = "rgb(178,182,194)";

  // POI dots + names (upstream dark has zero POI layers).
  style.layers.push(
    {
      id: "poi_dot",
      type: "circle",
      source: "openmaptiles",
      "source-layer": "poi",
      minzoom: 15,
      filter: ["all", poiClassOk, ["has", "name"]],
      paint: {
        "circle-radius": 2.5,
        "circle-color": "rgba(96,140,220,0.9)",
        "circle-stroke-width": 1,
        "circle-stroke-color": "rgba(0,0,0,0.6)",
      },
    },
    poiTextLayer("poi_label_major", {
      minzoom: 14,
      maxzoom: 16,
      rankMax: 10,
      color: "rgb(148,164,196)",
      halo: "rgba(0,0,0,0.85)",
    }),
    poiTextLayer("poi_label_all", {
      minzoom: 16,
      color: "rgb(148,164,196)",
      halo: "rgba(0,0,0,0.85)",
    })
  );
  return style;
}

// ---------- fmt-bright ----------
function buildBright(style) {
  style.name = "fmt-bright";
  // Native poi_r* layers already label ranked POIs with icons; this fills the
  // long tail of small named businesses from z16 (light-theme colors).
  style.layers.push(
    poiTextLayer("poi_label_all", {
      minzoom: 16,
      color: "rgb(72,80,96)",
      halo: "rgba(255,255,255,0.9)",
    })
  );
  return style;
}

const [dark, bright] = await Promise.all([fetchStyle("dark"), fetchStyle("bright")]);
for (const [file, style] of [
  ["fmt-dark.json", buildDark(dark)],
  ["fmt-bright.json", buildBright(bright)],
]) {
  writeFileSync(path.join(PUBLIC, file), JSON.stringify(style));
  console.log("wrote public/" + file, "layers:", style.layers.length);
}
