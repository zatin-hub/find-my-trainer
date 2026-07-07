// Single source of truth for the cities we operate in. Drives the city picker,
// map centering, geocoder biasing/bounding, and pin validation. A trainer's
// city is derived from its area (areas.city), so there's no city column on
// trainers.

export interface CityBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface City {
  slug: string;
  name: string;
  center: { lat: number; lng: number };
  bbox: CityBox;
}

export const CITIES: City[] = [
  {
    slug: "bengaluru",
    name: "Bengaluru",
    center: { lat: 12.9716, lng: 77.5946 },
    bbox: { minLat: 12.7, maxLat: 13.25, minLng: 77.35, maxLng: 77.9 },
  },
  {
    slug: "mumbai",
    name: "Mumbai",
    center: { lat: 19.076, lng: 72.8777 },
    bbox: { minLat: 18.85, maxLat: 19.32, minLng: 72.72, maxLng: 73.05 },
  },
  {
    slug: "delhi-ncr",
    name: "Delhi NCR",
    center: { lat: 28.6139, lng: 77.209 },
    bbox: { minLat: 28.3, maxLat: 28.98, minLng: 76.8, maxLng: 77.6 },
  },
];

export const DEFAULT_CITY = "bengaluru";

export function getCity(slug: string | null | undefined): City {
  return CITIES.find((c) => c.slug === slug) ?? CITIES[0];
}

export function inCity(lat: number, lng: number, citySlug?: string): boolean {
  const b = getCity(citySlug).bbox;
  return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
}
