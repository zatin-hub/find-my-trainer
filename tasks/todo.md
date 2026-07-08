# Launch blockers (do before public/marketing push)

- [ ] **Grievance contact is a placeholder** — appoint a real, monitored
      grievance email and replace `grievance@findmytrainer.example` in
      `app/privacy/page.tsx` and `app/terms/page.tsx` (DPDP requirement).
- [ ] Resend secrets (`RESEND_API_KEY`, `EMAIL_FROM`) so match alerts send in prod.
- [ ] Turnstile bot protection.
- [ ] Custom domain.
- [ ] Legal review pass over /privacy and /terms (drafted, not lawyer-reviewed).

# Backlog

- [ ] GitHub remote + push (repo is laptop-only — single point of failure).
- [ ] OTP brute-force cap on claims/verify (moot while ENABLE_CLAIMS=false).
- [ ] Marker clustering (~100+ pins).
- [ ] npm audit moderates; findSimilarTrainers full-table scan; modes/languages allowlist.
- [ ] Retention cleanup for stale seeker pins.
