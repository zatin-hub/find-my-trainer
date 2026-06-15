# Find My Trainer — Crowdsourced Trainer Recommendations for Bengaluru

> A free, anonymous, map-first product where Bengaluru locals crowdsource
> recommendations for fitness trainers and coaches across **every** activity —
> gym/PT, yoga, Zumba/dance, swimming, boxing/MMA, badminton, tennis, running,
> calisthenics, pilates, and more.
>
> Modeled on the philosophy of **bengaluru.rent**: take a market full of
> middlemen and noise, and crowdsource the *truth* — anonymously, on a map,
> for free.

---

## 1. The Insight (why this can work)

### 1.1 What bengaluru.rent does (the model we're emulating)
- **Anonymous, crowdsourced map** of *real* Bangalore rents (3,800+ data points
  pinned by actual renters).
- **Zero friction:** no login, no signup, no app.
- **"Seeker pins":** drop your budget + preference, get emailed when a matching
  listing appears within 2.5 km.
- **Trust-first positioning:** free, no paywall, no broker fees, never sells your
  data. It exists explicitly as an *antidote* to broker-inflated, spammy
  incumbents.
- The whole product is **one sharp idea executed cleanly** — not a feature pile.

### 1.2 The pain we're attacking (validated)
- **Demand is real and recurring.** Quora has repeatedly-asked threads ("How do
  I find a personal fitness trainer in Bangalore", "Who is the best personal gym
  trainer in Bangalore", "good gyms with proper trainers"). TeamBlind has
  multiple Bangalore trainer-reco threads (people stating they'll pay
  **₹20k/month** for a good certified trainer). LBB publishes "Bangaloreans
  recommend personal trainers" listicles.
- **The core complaint is trust:** "quality trainers are hard to find — plenty of
  regular guys but questionable skill." People want a *trusted human signal*, not
  ads.
- **Incumbents are disliked for the same reasons brokers are.** UrbanPro /
  Justdial / Sulekha run **lead-selling + pay-to-play "coin" systems**, **fake
  enquiries**, and trigger **spam calls**. Searching for a trainer there = your
  number gets sold.

### 1.3 Our wedge (the bengaluru.rent playbook, applied to trainers)
1. **Crowdsource the truth, anonymously** — real recommendations, real prices
   paid, real experiences from real trainees.
2. **No spam, ever** — we never sell contact data; trainees aren't turned into
   leads. This is the #1 differentiator and the marketing message.
3. **Free + frictionless** — no login to browse or to contribute.
4. **The differentiated data asset = "real prices paid + honest experience."**
   Just as bengaluru.rent's moat is *real rents*, ours is *real, area-level
   prices and candid trainer reviews* that incumbents hide behind lead walls.

### 1.4 Positioning one-liner
> **"Find a trainer your neighbours actually rate — anonymously, on a map, with
> no spam calls. Free."**

---

## 2. Product Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Login model | **Zero-login & anonymous** | Mirror bengaluru.rent; lowest friction. Spam handled via captcha + rate-limits + moderation (see §7). |
| Primary interface | **Map-first** | Familiar, on-brand with the reference; pins per trainer/area. List/filter view complements it. |
| Trainer profiles | **User-seeded, trainer-claimable** | Solves cold-start: content exists before trainers arrive. Trainers can later claim & verify. |
| Verticals at launch | **All activities** | Single flexible taxonomy; map + filters make breadth cheap. |
| City scope | **Bengaluru only (v1)** | Depth over breadth; identical to reference. Architecture stays city-agnostic for later. |

---

## 3. Tech Stack (chosen — optimized for a solo/small team, free-tier launch)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | SSR/SSG for SEO (critical — see §9), great DX, one codebase for pages + API routes. |
| UI | **Tailwind CSS + shadcn/ui** | Fast, clean, accessible components. |
| Map | **MapLibre GL JS** + free vector tiles (**Protomaps** self-host or **OpenFreeMap**) | No Google Maps billing; full styling control; clustering built-in. |
| Geocoding | **Photon / Nominatim** (OSM, free) with a paid fallback (MapTiler/Mapbox free tier) | Convert area names → coordinates for pins/seeker-pins. |
| DB + backend | **Supabase** (Postgres + **PostGIS**, Row Level Security, Storage, Edge Functions, Cron) | PostGIS = geo queries for the map + "within X km" seeker matching. Generous free tier. |
| Email (alerts) | **Resend** (or Postmark) | Seeker-pin match notifications + claim verification. |
| Anti-spam | **Cloudflare Turnstile** | Invisible captcha; no login needed; privacy-friendly. |
| Analytics | **Plausible** or **PostHog (EU)** | Privacy-respecting — on-brand with the no-data-selling ethos. |
| Hosting | **Vercel** (web) + **Supabase** (data) + **Cloudflare** (DNS/CDN/Turnstile) | All have free tiers; scales cheaply. |
| Domain | e.g. `bengalurutrainers.com`, `findmytrainer.in`, `bengaluru.fit` | Mirror the memorable, city-first naming of the reference. |

**Estimated running cost at launch: ₹0–₹1,500/month** (domain + email volume),
scaling only when traffic grows.

---

## 4. Data Model (Postgres + PostGIS)

> Anonymous contributors are tracked via a **signed `anon_id` cookie** (random
> UUID, server-set, httpOnly). This lets us attribute votes, allow a contributor
> to edit/delete *their own* submissions, and rate-limit — **without accounts.**

```
activities                -- taxonomy of fitness activities
  id, slug, name, icon, parent_id (nullable for sub-categories), sort_order

areas                     -- Bengaluru localities (Indiranagar, Koramangala, ...)
  id, slug, name, centroid GEOGRAPHY(Point), aliases[]

trainers                  -- the core entity (user-seeded, claimable)
  id, slug, name, gender, bio,
  location GEOGRAPHY(Point), area_id, address_text,
  modes[]            -- {in_person, home_visit, online}
  languages[],
  contact_instagram, contact_phone (nullable, gated — see §8 privacy),
  price_min, price_max, price_unit (per_session|per_month),
  status             -- pending | approved | rejected | merged
  claimed_by (nullable -> claims), verified_at (nullable),
  dedupe_hash, created_by_anon, created_at, updated_at

trainer_activities        -- many-to-many trainer <-> activity
  trainer_id, activity_id

recommendations           -- THE crowdsourced unit (an honest endorsement)
  id, trainer_id, activity_id,
  anon_id,                 -- contributor token
  rating (1-5, optional), would_recommend (bool),
  body TEXT,               -- "why" — min length enforced
  price_paid, price_unit,  -- the differentiated data (like 'real rents')
  trained_duration,        -- e.g. "6 months"
  area_id, location GEOGRAPHY(Point),
  helpful_count (denormalized),
  status                   -- pending | approved | rejected | hidden
  created_at

rec_votes                  -- "helpful" votes, dedup by anon_id
  recommendation_id, anon_id, created_at

seeker_pins                -- the 'seeker pin' analog
  id, email, activity_id, area_id, location GEOGRAPHY(Point),
  radius_m (default 3000), budget_max, mode_pref[],
  confirmed (bool), unsubscribe_token, created_at, last_notified_at

reports                    -- moderation flags
  id, target_type (trainer|recommendation), target_id, reason, note,
  anon_id, status, created_at

claims                     -- trainer claim requests (light OTP auth)
  id, trainer_id, contact_method (email|phone), contact_value,
  otp_hash, verified_at, status, created_at

audit_log                  -- admin actions, for trust/transparency
  id, actor, action, target_type, target_id, meta jsonb, created_at
```

**Key indexes:** GiST on all `GEOGRAPHY` columns (map + radius queries), trigram
index on `trainers.name` (dedupe + search), composite on
`(activity_id, area_id, status)` for filtered list/SEO pages.

**Dedupe strategy:** on trainer insert, fuzzy-match `name` (trigram) + phone +
area; if a likely duplicate exists, attach the new recommendation to the existing
trainer instead of creating a new pin (keeps the map clean — the #1 data-quality
risk).

---

## 5. Core User Flows

### 5.1 Seeker (browse — no account)
1. Land on map of Bengaluru with trainer pins (clustered).
2. Filter: activity, area, price range, mode (in-person/home/online), gender,
   min rating, language.
3. Click pin → **trainer card**: name, activities, area, price range, aggregate
   rating, and the crowdsourced **recommendations** (with real prices paid).
4. Optionally **drop a seeker pin** ("I want a yoga teacher near HSR under
   ₹3k/month") → get emailed when a match appears.

### 5.2 Contributor (recommend — no account)
1. Click **"Recommend a trainer."**
2. Search existing trainers (to avoid dupes) or **add a new one** (name,
   activity, area on map, price, modes, optional Instagram).
3. Write the recommendation: rating, "why", price paid, how long trained.
4. Turnstile check → submit → enters **moderation queue** → appears live once
   approved (or auto-approved with trust heuristics; see §7).

### 5.3 Trainer (claim — light auth, post-MVP-friendly)
1. On their profile, click **"Is this you? Claim profile."**
2. Verify via OTP (email/phone) → can edit bio, hours, links, add photos.
3. **Claiming does NOT let them delete honest reviews** — only respond to them.
   (Trust integrity is the brand.)

### 5.4 Admin (moderation)
- Protected dashboard: approve/reject queue, merge duplicate trainers, handle
  reports/takedowns, shadow-ban abusive `anon_id`s, view audit log.

---

## 6. Build Plan — Phased, Step-by-Step

> Effort estimates assume one capable full-stack dev. Each phase ends with a
> **shippable** increment and explicit **acceptance criteria**.

### Phase 0 — Foundations (½–1 week)
- [ ] Finalize name + buy domain; set up Cloudflare DNS.
- [ ] Create Next.js + TS + Tailwind + shadcn/ui app; commit to this repo.
- [ ] Create Supabase project; enable PostGIS; set up local dev (`supabase` CLI,
      migrations).
- [ ] Decide the **activity taxonomy** (seed `activities`) and a **Bengaluru
      `areas`** list with centroids (~80–120 localities).
- [ ] Set up CI (lint, typecheck, build) and Vercel preview deploys.
- **Acceptance:** blank app deploys to Vercel; DB migrations run; map renders
  Bengaluru with free tiles.

### Phase 1 — Data layer (½ week)
- [ ] Write all migrations from §4; add indexes; add RLS policies (public read of
      `approved` rows; writes via API routes / Edge Functions only).
- [ ] Seed `activities` and `areas`.
- [ ] Create typed DB client + query helpers (geo radius, filtered search).
- **Acceptance:** can insert a trainer + recommendation via SQL and query
  "trainers within 3 km of a point, activity = yoga."

### Phase 2 — Read experience (map + directory) (1–1.5 weeks)
- [ ] Map page: MapLibre + clustered trainer pins, viewport-bounded fetching.
- [ ] Filters (activity, area, price, mode, gender, rating, language) synced to
      URL query params (shareable + SEO-able).
- [ ] List/directory view toggle (cards) sharing the same filter state.
- [ ] **Trainer profile page** (`/trainer/[slug]`): details + aggregated rating +
      recommendations list + "real price paid" stats.
- [ ] Seed **50–100 real trainers** manually across areas so the map is never
      empty (cold-start; see §10).
- **Acceptance:** a stranger can find, filter, and read about trainers on mobile
  with zero account; pages are server-rendered.

### Phase 3 — Crowdsourcing write path + anti-abuse (1.5 weeks)
- [ ] `anon_id` cookie issuance (signed, httpOnly).
- [ ] "Add trainer" flow with **map pin placement** + geocoding of area, plus
      **live dedupe suggestions** as they type the name.
- [ ] "Recommend" flow (rating, body w/ min length, price paid, duration).
- [ ] Cloudflare Turnstile on all writes; server-side rate limiting (per IP +
      per `anon_id`); honeypot field; profanity/spam pre-filter.
- [ ] Moderation queue + admin dashboard (approve/reject/merge/ban) + report
      button on every trainer/recommendation.
- [ ] Contributor can edit/delete **their own** submissions (via `anon_id`).
- **Acceptance:** an anonymous user adds a trainer + recommendation; it lands in
  the queue; admin approves; it appears on the map. Obvious spam is blocked.

### Phase 4 — Seeker pins + email alerts (1 week)
- [ ] Seeker-pin form (activity + area/point + radius + budget + email).
- [ ] Double opt-in email confirmation (Resend) + one-click unsubscribe.
- [ ] **Supabase Cron** job: when a new approved trainer/recommendation matches
      an active seeker pin (PostGIS radius + filters), email the seeker.
- **Acceptance:** drop a pin, add a matching trainer, receive an email within the
  cron interval; unsubscribe works.

### Phase 5 — SEO & programmatic pages (1 week) — *growth engine*
- [ ] Programmatic landing pages: `/[activity]/[area]` (e.g.
      `/yoga/indiranagar`) and `/[activity]` city pages, server-rendered with
      real listings + FAQ schema.
- [ ] `sitemap.xml`, `robots.txt`, OpenGraph/Twitter cards, JSON-LD
      (`LocalBusiness` / `Person` for trainers, `AggregateRating`).
- [ ] Fast Core Web Vitals (this drives free Google traffic — exactly how the
      reference site grows).
- **Acceptance:** Lighthouse SEO ≥ 95; programmatic pages indexable and
  internally linked.

### Phase 6 — Trainer claim flow (½–1 week)
- [ ] "Claim this profile" → OTP via email/phone → claimed status.
- [ ] Claimed trainers can edit profile + **respond** to recommendations (cannot
      delete them); add photos to Storage.
- [ ] "Verified" badge logic (claimed + optional manual checks).
- **Acceptance:** a trainer claims, edits their bio, and replies to a review.

### Phase 7 — Launch hardening + distribution (1 week)
- [ ] Analytics (Plausible/PostHog), error tracking (Sentry free tier).
- [ ] Legal pages: Privacy Policy (DPDP-aware, §8), Terms, Takedown/Contact,
      Community Guidelines.
- [ ] Performance/load pass; backup strategy; admin runbook.
- [ ] Execute distribution plan (§11): r/bangalore, TeamBlind, local Telegram/
      WhatsApp fitness groups, Instagram micro-creators, Quora answers.
- **Acceptance:** public launch; first 100 organic recommendations; alerts firing.

### Phase 8 — Post-MVP roadmap (later)
- WhatsApp-based seeker alerts; "Requests" community feed; trainer availability/
  booking handoff (without becoming a lead-seller); city expansion (one schema
  flag); PWA/offline; reputation scoring for contributors; optional, ethical
  monetization (§12).

**Rough MVP timeline: ~7–9 focused weeks** for Phases 0–7.

---

## 7. Trust & Anti-Abuse (critical — zero-login makes this make-or-break)

The hardest part of a no-login, crowdsourced site is keeping it honest. Layered
defenses:

1. **Friction for bots, not humans:** Cloudflare Turnstile on every write;
   honeypot fields.
2. **Rate limits:** per IP and per `anon_id` (e.g. max N submissions/day);
   exponential backoff.
3. **Moderation queue:** all new trainers + recommendations reviewed before going
   live (start fully manual; later auto-approve trusted patterns).
4. **Quality gates:** min review length; require a "why"; reject empty/duplicate
   text; flag suspiciously positive bursts on one trainer (review-bombing /
   self-promotion detection).
5. **Dedup + merge:** prevent fake duplicate profiles; admin merge tool.
6. **Report + takedown:** one-click report on everything; fast SLA.
7. **Shadow-ban:** abusive `anon_id`s see their own content but nobody else does.
8. **Contributor reputation (later):** `anon_id`s with many "helpful"-voted,
   un-flagged reviews graduate to auto-approval.
9. **Transparency:** public audit of moderation actions count; "community-added,
   unverified" labels until corroborated — honesty is the product.

**Anti-pattern to avoid:** we are **not** a lead-gen marketplace. We never sell
trainee contact info. That restraint *is* the brand.

---

## 8. Privacy & Legal (India / DPDP Act 2023) — do not skip

Listing real people (trainers) and collecting emails has obligations:
- **Trainer contact data is gated:** show name + area + (optional) Instagram by
  default. **Phone numbers shown only after a trainer claims & consents**, or not
  at all — this avoids scraping/harassment and is the ethical + legal-safe
  default. (Also a feature: protects trainers, builds goodwill.)
- **Clear takedown path:** any trainer can request edit/removal of their listing
  (email + in-page button). Honor promptly.
- **Seeker emails:** double opt-in, easy unsubscribe, never sold/shared (state it
  loudly — it's the brand).
- **Privacy Policy + Terms + Community Guidelines** at launch.
- **Defamation care:** community guidelines require reviews to be first-hand and
  factual; provide trainer right-of-reply; remove unverifiable defamatory claims
  on report.
- **Cookie/consent banner** only if analytics requires (Plausible is
  cookieless — another reason it's chosen).

---

## 9. SEO & Distribution Strategy (how it grows for free)

bengaluru.rent grows via word-of-mouth + organic search. Same here:
- **Programmatic SEO** is the long-term engine: `/[activity]/[area]` pages target
  exactly what people Google ("yoga teacher in Koramangala"). Hundreds of
  internally-linked, content-rich pages.
- **Structured data** (JSON-LD) for rich results.
- **Shareable hook:** "real prices paid" + "no spam" is inherently shareable —
  screenshots of area price ranges spread on social.

---

## 10. Cold-Start Plan (avoid the empty-map death)

A crowdsourced map is worthless empty. Seed it before launch:
1. **Manually curate 50–150 real trainers** across major areas from *public*
   sources (LBB listicles, public Instagram fitness pages, public Quora answers,
   gym websites) — clearly labeled **"community-added, unverified."**
2. **Plant a few honest recommendations** you/your network can write first-hand.
3. **Pre-seed seeker pins** by inviting friends to drop what they're looking for,
   so the first contributors see demand.
4. **Concierge first 20 users:** personally help early seekers find a trainer to
   generate real testimonials.

> Ethics/legal note: seed only public info, gate phone numbers (§8), and honor
> takedowns. Don't scrape login-walled or paid platforms.

---

## 11. Go-To-Market (Bengaluru)

- **Reddit r/bangalore**, **TeamBlind** (active trainer-reco threads already
  exist — answer them with the tool).
- **Local Telegram/WhatsApp** fitness & neighbourhood groups.
- **Instagram** micro-creators (yoga/lifting/running coaches) — they benefit from
  honest visibility without paying for leads.
- **Quora answers** on the existing "find a trainer in Bangalore" questions.
- **Launch narrative:** "I was tired of UrbanPro/Justdial selling my number and
  spamming me, so I built a free, anonymous map of trainers Bangaloreans actually
  rate." (Mirrors the reference site's origin-story marketing.)

---

## 12. Monetization (later, and only without breaking trust)

Keep MVP **100% free, no ads, no data selling** — that's the moat. Future options
that don't compromise it:
- Optional **trainer "Pro" profile** (photos, featured ordering within honest
  results, analytics) — paid by *trainers*, never by selling trainee data.
- **Sponsored placements clearly labeled**, capped, never displacing honest
  ranking.
- **Donations / "buy me a coffee"** (bengaluru.rent-style goodwill).
- Avoid the incumbent trap (lead-selling, pay-to-rank) at all costs.

---

## 13. Success Metrics

- **Liquidity:** # trainers with ≥1 recommendation; % areas covered; # activities
  with depth.
- **Engagement:** weekly active seekers; recommendations added/week; "helpful"
  votes.
- **Outcome:** seeker pins → matches emailed → reported "found my trainer."
- **Trust:** spam-rejection rate, report-resolution SLA, % verified/claimed
  trainers.
- **Growth:** organic search impressions on `/[activity]/[area]` pages.

---

## 14. Top Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Empty map at launch | Cold-start seeding (§10), concierge first users. |
| Spam / fake reviews (no login) | Layered anti-abuse (§7); moderation queue first, automation later. |
| Trainer privacy / legal | Gate phone numbers, takedown flow, DPDP-aware policies (§8). |
| Duplicate trainer pins | Fuzzy dedupe + admin merge (§4). |
| Low contribution rate | Make recommending a 60-second job; show demand (seeker pins); seed examples. |
| Incumbent imitation | Move fast on trust/brand; "no spam, no data selling" is hard for them to copy. |

---

## 15. Immediate Next Steps (when you say go)

1. Confirm **name + domain**.
2. Scaffold Next.js + Supabase (Phase 0) in this repo.
3. Draft the **activity taxonomy** + **Bengaluru areas** seed lists for your
   review.
4. Build Phases 1–2 (data + read experience) and seed the first ~50 trainers so
   you can *see* the map populated end-to-end.

> This document is the living plan. We'll check items off and revise as we build.
