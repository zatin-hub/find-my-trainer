# LAUNCH.md — public-launch checklist

> Living doc. Update it in the same change that closes an item (same rule as
> CODEMAP.md). `tasks/todo.md` is day-to-day scratch; this is the launch gate.
> Before announcing publicly: every P0 checked, P1 consciously accepted or done.

## P0 — blockers (do NOT go public without these)

- [ ] **Grievance contact is fake.** Appoint a real, monitored email; replace
      `grievance@findmytrainer.example` in `app/privacy/page.tsx` and
      `app/terms/page.tsx`. DPDP requirement; also our takedown channel.
- [ ] **Match-alert emails can't send in prod.** Set Worker secrets
      `RESEND_API_KEY` + `EMAIL_FROM` (verified domain in Resend), then send a
      real end-to-end alert (create pin → add matching trainer → email arrives,
      unsubscribe link works over HTTPS).
- [ ] **Legal review pass** over /privacy and /terms (drafted by AI, not
      lawyer-reviewed).
- [ ] **Decide repo visibility.** github.com/zatin-hub/find-my-trainer is
      PUBLIC today. Fine if intentional (no secrets in git); flip with
      `gh repo edit zatin-hub/find-my-trainer --visibility private` if not.

## P1 — strongly recommended before a marketing push

- [ ] **Bot protection (Turnstile)** on add-trainer, recommend, match-alert,
      and report forms. Honeypots + rate limits exist but won't survive
      attention.
- [ ] **Custom domain** (workers.dev URL reads as temporary; also needed for a
      credible EMAIL_FROM).
- [ ] **D1 backup cadence** — schedule `npx wrangler d1 export find-my-trainer
      --remote` (weekly at minimum) so crowdsourced data isn't one bad
      migration away from gone.
- [ ] **Rename default branch to `main`** (currently
      `claude/optimistic-goldberg-feo4qc`): `git branch -m main &&
      git push -u origin main`, switch default on GitHub, delete old ref.
- [ ] **Admin key hygiene** — confirm prod `ADMIN_KEY` is long + random and
      `ADMIN_SESSION_SECRET` is set (session tokens shouldn't derive from the
      login key).
- [ ] **Watch first-week logs** — Workers Logs dashboard + `npx wrangler tail
      find-my-trainer --status error` during the announcement window.

## P2 — post-launch backlog (revisit as usage grows)

- [ ] Marker clustering once a city passes ~100 pins.
- [ ] Retention job: purge seeker pins with no matching activity in 12 months
      (promised in /privacy "no longer than the purpose requires").
- [ ] OTP brute-force cap on `claims/verify` — REQUIRED before flipping
      `ENABLE_CLAIMS=true`; moot until then.
- [ ] `findSimilarTrainers` full-table scan — fine at current size, revisit
      at ~1k trainers.
- [ ] `npm audit` moderates; modes/languages request allowlist.
- [ ] Ola style retest when their Style Editor ships; Mappls as escalation
      path if OSM POI coverage disappoints.
- [ ] Multi-city readiness pass: seed real areas for Mumbai / Delhi NCR
      beyond the current set before promoting those cities.

## Day-of-launch smoke (run top to bottom)

1. `npx vitest run` green, `npx tsc --noEmit` clean.
2. Secrets present: `npx wrangler secret list` shows ADMIN_KEY,
   ADMIN_SESSION_SECRET, OLA_MAPS_API_KEY, RESEND_API_KEY, EMAIL_FROM.
3. `npm run cf:migrate` (no-op if current) → `npm run cf:build && npm run cf:deploy`.
4. 200s: `/`, `/privacy`, `/terms`, `/fmt-bright.json`, `/api/geocode?q=indiranagar&city=bengaluru`.
5. Admin: login, check Overview stats, Map & usage counters ticking.
6. Real-device pass: phone → search a street, tap a pin (profile panel), get
   directions, set a match alert, receive the email, unsubscribe.
7. `npx wrangler tail find-my-trainer --status error` open during announcement.

## Done log

- 2026-07-08 — DPDP: /privacy + /terms live, one-click unsubscribe in alert
  emails (HMAC, GET-confirm/POST-delete), footer links, launch-blocker list
  started.
- 2026-07-08 — GitHub remote wired (`origin` → zatin-hub/find-my-trainer),
  all work pushed; deployed map-config + UX batch (version 3e2a86f8).
