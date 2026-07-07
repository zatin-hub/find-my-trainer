# findmytrainer — Bengaluru

A free, anonymous, **map-first** product to crowdsource fitness-trainer
recommendations across Bengaluru — gym/PT, yoga, Zumba, swimming, boxing,
badminton, tennis, running, calisthenics, and more.

Inspired by the philosophy of [bengaluru.rent](https://bengaluru.rent): take a
market full of middlemen and noise and crowdsource the *truth* — anonymously, on
a map, for free. **We never sell your data or your number.**

> See [`PLAN.md`](./PLAN.md) for the full research, product strategy, and phased
> build plan. This repo currently implements the **local MVP** (Phases 1–4 in a
> simplified, zero-dependency form).

## What's working in this MVP

- 🗺️ **Map of Bengaluru** with trainer pins (MapLibre + free OpenFreeMap tiles —
  no API key needed).
- 🔎 **Filters** — activity, area, mode (in-person / home visit / online),
  trainer gender, and name search — synced to a live trainer list.
- 👤 **Trainer profiles** with crowdsourced recommendations and a **"real
  average price paid"** stat (the differentiated data, like bengaluru.rent's real
  rents).
- ✍️ **Add a trainer + recommend** — fully anonymous, no account (an `anon_id`
  cookie attributes contributions and enables rate-limiting later).
- 🔔 **Seeker pins + matching** — leave an email + what you're looking for; when a
  newly-added trainer matches (activity + area/radius + budget), an alert is
  sent. Email delivery is pluggable: real **Resend** send if `RESEND_API_KEY` is
  set, otherwise logged to the console so it's testable locally. Sent alerts show
  in the admin dashboard.
- 👍 **Helpful voting** & 🚩 **reporting** on recommendations (anonymous,
  deduped per visitor).
- 🧭 **Browse / SEO pages** — `/activities`, `/activities/[activity]`,
  `/activities/[activity]/[area]`, plus `sitemap.xml` and `robots.txt`.
- 🛡️ **Trust & safety** — per-IP rate limiting, honeypot fields, and an
  **admin moderation dashboard** at `/admin` (local key: `letmein`, override with
  `ADMIN_KEY`) to action reports and hide/approve trainers & recommendations.
- 🧬 **Duplicate handling** — as you type a trainer name, the add form suggests
  existing matches (fuzzy, area-aware) to prevent duplicates; admins can **merge**
  one trainer into another (recommendations/activities move over, the duplicate is
  hidden and its URL redirects to the canonical profile).
- 🔑 **Trainer claim flow** — OTP-based ("Is this you? Claim profile"). Verified
  owners get a ✓ badge, can **edit their profile**, add a **phone number** (only
  shown once claimed/consented), and **reply** to recommendations. Locally the
  OTP is returned in the response since no email/SMS is wired (`EXPOSE_DEV_OTP`).

## Tech

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **SQLite** via `better-sqlite3` — zero external services; the DB is created and
  **seeded automatically** on first run (sample, clearly-illustrative trainers).
- **MapLibre GL JS** with free vector tiles.

> The production design (Postgres + PostGIS, Supabase, Turnstile, email) is
> described in `PLAN.md`. SQLite + in-JS geo math is used here so it runs fully
> locally with no setup.

## Run it locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

On first run the local database (`data/app.db`) is created and seeded
automatically. To reset it, delete `data/app.db*` and restart.

## Tests

Unit + regression tests run with **Vitest**:

```bash
npm test         # run once
npm run test:watch
```

Coverage: geo math, formatting, rate limiting, claim hashing, and the
`listTrainers` query layer — multi-select filter semantics (OR within a
category, AND across), the name/area/activity free-text search, price/rating
filters, and status visibility (hidden/merged trainers never leak). Query tests
run against an isolated temp DB via the `FMT_DB_PATH` override, so they never
touch `data/app.db`.

> Note: in `next dev`, the *very first* page compile can occasionally log a
> one-time error and 500 — just refresh. This is a Next.js dev-mode warm-up
> quirk; production (`npm run build && npm run start`) serves cleanly from the
> first request.

## Project layout

```
app/                 # routes (home map, /trainer/[slug], /add) + API routes
components/           # MapView, filters/list, forms (client components)
lib/                 # db (schema + seed), queries, geo, formatting, types
data/seed.ts         # activity taxonomy, Bengaluru areas, sample trainers
PLAN.md              # full research + product + build plan
```

## Roadmap

Done so far: map browse + filters, trainer profiles, anonymous add/recommend,
seeker pins, voting/reporting, programmatic SEO pages, rate limiting + honeypot,
admin moderation dashboard, and the OTP-based trainer claim/edit/reply flow.

Next up (see `PLAN.md`): real OTP/email delivery config + Cloudflare Turnstile,
and migration to Postgres/PostGIS for production. (Seeker-pin matching, pluggable
email, and duplicate detection/merge are done.)

## Environment variables (all optional locally)

| Var | Purpose | Default |
| --- | --- | --- |
| `ADMIN_KEY` | Admin dashboard key | `letmein` |
| `RESEND_API_KEY` | Real email sending (else logged) | unset → log |
| `EMAIL_FROM` | From address for alerts | `alerts@findmytrainer.local` |
| `EXPOSE_DEV_OTP` | Return claim OTP in response | `true` (set `false` in prod) |
| `NEXT_PUBLIC_SITE_URL` | Base URL for links/sitemap | `http://localhost:3000` |

## Switching the map to Google Maps

Today the map uses **MapLibre GL JS** with free **OpenFreeMap** vector tiles —
zero cost, no API key, and already dark-themed. The entire map lives in
[`components/MapView.tsx`](./components/MapView.tsx) (the only file importing
`maplibre-gl`), so swapping to the **Google Maps JavaScript API** is a contained
change. Here's what it takes:

**1. Google Cloud / billing (the main trade-off)**

- Create a Google Cloud project with **billing enabled**. Google Maps is *not*
  free beyond a monthly credit — "Dynamic Maps" (Maps JS) runs ~**$7 per 1,000
  map loads** after the free tier. OpenFreeMap costs nothing, so only switch if
  you specifically need Google's basemap, Street View, or Places.
- Enable the **Maps JavaScript API** in that project.
- Create an **API key** and restrict it to your HTTP referrers
  (`localhost:3000`, your prod domain).
- (Recommended) Create a **Map ID** with cloud-based **dark styling** so it
  matches the theme, and to use Advanced Markers.

**2. Config / env**

- Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (and optional
  `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`). They must be `NEXT_PUBLIC_*` because the key
  is used in the browser.
- Swap the dependency: remove `maplibre-gl`, add a loader such as
  `@googlemaps/js-api-loader`.

**3. Code — only `components/MapView.tsx`**

- Drop `import maplibregl` + `import "maplibre-gl/dist/maplibre-gl.css"`; load the
  Google script via the loader instead.
- `new maplibregl.Map({...})` → `new google.maps.Map(el, { center: {lat,lng},
  zoom, mapId })`. **Note:** Google uses `{lat, lng}` objects, *not* `[lng, lat]`
  arrays — every coordinate flips.
- Custom emoji pins → `google.maps.marker.AdvancedMarkerElement` (the existing
  emoji-button HTML can be reused as the marker `content`).
- `map.flyTo({center, zoom})` → `map.panTo({lat, lng})` + `map.setZoom(...)`.
- Remove the OpenFreeMap style URL + demo-tiles fallback; Google handles tiles,
  and the dark theme comes from the Map ID's cloud style.
- The component's props (`trainers`, `selectedSlug`, `onSelect`) stay the same, so
  nothing else needs to change. It already renders client-side via
  `dynamic(..., { ssr: false })`, which Google requires.

**4. Cleanup & constraints**

- Remove the `.maplibregl-*` rules in [`app/globals.css`](./app/globals.css);
  Google injects its own controls.
- Google's logo and Terms-of-Service attribution **cannot** be removed.

> Safest path if you want both: load Google when a key is set, otherwise fall
> back to the current MapLibre map.
