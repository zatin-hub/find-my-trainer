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
- 🔔 **Seeker pins** — leave an email + what you're looking for; in production a
  cron job emails you when a match appears nearby (stubbed locally — pins are
  saved).

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

Next up (see `PLAN.md`): moderation queue + anti-abuse (Turnstile, rate limits),
trainer "claim" flow, programmatic SEO pages (`/[activity]/[area]`), real email
alerts, and migration to Postgres/PostGIS for production.
