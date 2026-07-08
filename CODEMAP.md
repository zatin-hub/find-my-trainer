# CODEMAP — file → purpose → key exports

> Freshness contract: update this file IN THE SAME CHANGE that adds/removes/
> moves a file or alters a module's public exports. If reality contradicts
> this map, fix the map first, then continue. Spot-check: `ls lib components`.

## lib/ (all logic lives here; routes are thin glue)
- `database.ts` — async DB adapter: D1 on Workers / better-sqlite3 locally. `db()`
- `runtime.ts` — workerd detection gate. `inWorkers()`
- `db.ts` — local sqlite init/schema/idempotent migrate/seed. `getDb()`, `slugify`, `DB_PATH`
- `queries.ts` — all read queries + admin lists/stats (risk-sorted). `listTrainers`, `getTrainerBySlug`, `adminListTrainers`, `adminStats`, `findSimilarTrainers`
- `types.ts` — shared interfaces. `Trainer`, `Area` (has `city`), `Recommendation`
- `cities.ts` — city SSOT (slugs/centers/bboxes). `CITIES`, `DEFAULT_CITY`, `getCity`, `inCity`
- `geocode.ts` — Ola (env-gated) + Photon + Nominatim merged forward/reverse geocode, city-bounded, cached. `geocode`, `reverseGeocode`
- `geocache.ts` — 30-day geocode cache: KV (prod, `geo:` prefix on RATE_LIMIT ns) / memory (dev). `cacheGet`, `cacheSet`, `forwardKey`, `reverseKey`
- `settings.ts` — admin-tunable key/value store (settings table). `getSetting`, `getSettings` (batch), `setSetting`
- `mapstyle.ts` — map config: provider (hybrid/ola) + hybrid base style (OFM styles + custom `fmt-dark`). `getMapConfig`, `resolveMapStyle`, `HYBRID_STYLES`, `isHybridStyle`
- `map-client.ts` — client-safe helpers; appends api_key to Ola sub-requests + batched tile-usage beacon. `olaTransform`
- `usage.ts` — self-measured provider usage counters (usage_counters table). `bumpUsage`, `getUsage`
- `moderation.ts` — destructive admin cascades (tested). `deleteTrainerCascade`, `deleteRecommendationCascade`
- `fakescore.ts` — fake-entry risk heuristics 0–100. `assessFake`
- `votes.ts` — helpful-vote toggle + IP dedup. `applyVote`, `hashIp`
- `match.ts` — seeker-pin matching → email alerts (tested). `notifyMatchingSeekers`
- `notify.ts` — pluggable email (Resend | dev console). `sendEmail`
- `instagram.ts` — best-effort IG existence probe (pluggable). `verifyInstagram`
- `ratelimit.ts` — KV (prod) / memory (dev) limiter. `rateLimit`, `clientIp`
- `admin.ts` — admin key/cookie auth, constant-time. `isAdmin`, `checkAdminKey`, `adminToken`
- `anon.ts` — anonymous visitor id cookie. `getAnonId`, `setAnonCookie`
- `claim.ts` — claim-flow gating + OTP hash. `claimsEnabled`, `isOwner`, `hashOtp`
- `geo.ts` — haversine. `distanceMeters` · `format.ts` — price/distance/stars display

## app/api/ (validate → rate-limit → lib call)
- `trainers` — GET filtered list (city/activity/area/mode/gender/q/price/rating), POST create (honeypot, IG mandatory, pin clamped to city)
- `trainers/similar` — dupe check · `trainers/[slug]/edit|reply` — owner actions
- `recommendations` (+`[id]/vote`) — add rec / toggle vote
- `geocode` — proxy for lib/geocode (rate-limited; `?q=` or `?lat&lng`)
- `seeker-pins` — match-alert signup · `reports` — flag content
- `admin/login|moderate` — auth; moderate = approve/hide/delete/merge/verify/IG-check/map provider+style + audit log
- `claims/start|verify` — OTP claim (gated off in prod)

## app/ (pages, all force-dynamic)
- `page.tsx` — home SSR, reads `?city=` · `layout.tsx` — header (logo, CitySwitcher, alert + add CTAs)
- `add` · `alert` — wizard pages · `trainer/[slug]` — profile
- `admin/` — sidebar IA: layout.tsx (auth gate + nav w/ badges), pages: overview,
  trainers, recommendations, reports, alerts, map (provider+usage), audit
- `activities` (+`[activity]`, `[activity]/[area]`) — SEO browse pages · `sitemap.ts`, `robots.ts`

## components/
- `HomeClient` — home state hub: filters, search, city scoping, list+map, scroll fade
- `MapView` — MapLibre + admin-selected style, recolor-not-rebuild pins, geolocate control · `LocationPicker` — draggable-pin + address search (add flow)
- `LocationSearch` — two-tier: instant area matches + debounced street results via /api/geocode · `FilterBar` — master-detail filter panel · `CitySwitcher` — header city popover
- `AddTrainerForm` — 4-step add wizard · `MatchAlertForm` — 3-step alert wizard · `RecommendForm` — rec on profile
- `TrainerCard`, `RecommendationList` — display · `AdminLogin` + `admin/*` panels
  (AdminNav, TrainersPanel, RecsPanel, ReportsPanel, AlertsPanel, MapPanel,
  AuditPanel, shared.tsx = useModerate hook + badges) · `ClaimFlow`, `EditProfile` — claim (gated)

## Other
- `data/seed.ts` — taxonomy + 44 areas (city-tagged) + local-only sample trainers
- `public/fmt-dark.json` — custom OFM dark style: POI dots+names, navy water,
  brighter labels (generated from OFM dark; layers `poi_dot`, `poi_label_*`)
- `migrations/` — D1 SQL (remote); local equivalent lives in db.ts `migrate()`
- `tests/` — vitest, isolated temp DB via `FMT_DB_PATH` (14 files)
- `wrangler.toml` — Workers config: D1/KV bindings, observability, vars
