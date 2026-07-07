# find-my-trainer

Crowdsourced fitness-trainer map (Bengaluru/Mumbai/Delhi NCR). Next.js 15 App
Router + TS + Tailwind v4, deployed on Cloudflare Workers via OpenNext.
LIVE: https://find-my-trainer.bhoj-jatin.workers.dev

## Commands (node 22 required — system node is broken)

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"   # ALWAYS first
npm run dev            # local dev (better-sqlite3, data/app.db, auto-seeds)
npx vitest run         # full test suite — keep green
npx tsc --noEmit       # typecheck
npm run cf:build && npm run cf:deploy   # deploy (deploy alone does NOT build)
npm run cf:migrate     # apply migrations/ to REMOTE D1 — run BEFORE deploying schema-dependent code
```

## Architecture invariants (do not break)

- **Dual data layer**: lib/database.ts adapter — D1 on Workers, better-sqlite3
  locally, selected by `inWorkers()` (lib/runtime.ts). NEVER remove that gate;
  `next dev` breaks with an empty local D1 without it.
- **Schema changes go to BOTH layers**: idempotent ALTER in lib/db.ts
  `migrate()` (local) AND a new numbered file in migrations/ (D1).
- **Single sources of truth**: lib/cities.ts (cities/bboxes), data/seed.ts
  (taxonomy + areas; city lives on the area — trainers inherit it).
- **External APIs are proxied**: geocoding = Photon + Nominatim merged behind
  /api/geocode (rate-limited, city-bounded). Client never calls providers.
- **Metered D1**: batch IN-queries, aggregate JOINs — no N+1, no per-row
  correlated subqueries.
- Queries are async via `await db()`; routes stay thin, testable logic in lib/.

## Product/security facts

- Instagram handle is the primary trust signal — mandatory on trainer add.
- Admin: /admin, key via `ADMIN_KEY` Worker secret (default `letmein` refused
  in prod). Destructive actions: lib/moderation.ts, audit-logged, unit-tested.
- Anti-abuse: KV rate limits (in-memory locally), honeypots, per-(rec,IP-hash)
  vote dedup, fake-risk scoring in lib/fakescore.ts.
- ENABLE_CLAIMS=false in prod (OTP claim flow gated off).
- Prod D1 seeds taxonomy only — never seed sample trainers remotely.

## Debugging & logs

Four log surfaces — pick by question:

| Question | Surface | How |
|---|---|---|
| "Is prod erroring right now?" | Live Worker stream | `npx wrangler tail find-my-trainer` (Ctrl-C to stop; add `--status error` to filter) |
| "What happened earlier in prod?" | Workers Logs (persisted; `[observability]` in wrangler.toml) | Cloudflare dashboard → Workers → find-my-trainer → Logs |
| "Who deleted/hid/verified what?" | `admin_audit` D1 table | `npx wrangler d1 execute find-my-trainer --remote --command "SELECT * FROM admin_audit ORDER BY id DESC LIMIT 20"` |
| "Why is local dev broken?" | dev server log file | run dev redirected to a file (`npm run dev > dev.log 2>&1 &`), then `grep -iE 'error|⨯' dev.log` — never eyeball the stream |

Inspect prod data directly (read-only debugging):
`npx wrangler d1 execute find-my-trainer --remote --command "SELECT ..."`

Log conventions (writing code):
- Prefix every log with an area tag: `[match]`, `[email]`, `[admin]`, `[claim]`.
- Errors: `console.error(tag, message, err)` with enough context to act on.
- NEVER log secrets or PII: no OTPs, tokens, emails, raw IPs (prod logs persist).
- Dev-only logs: gate with `process.env.NODE_ENV !== "production"`.

## Process

- **Navigation: read CODEMAP.md before exploring** — it answers "where does X live"
  in one read. Update it IN THE SAME CHANGE that adds/moves/removes a file or
  changes a module's public exports (same rule as updating tests). If the map
  contradicts reality, fix the map first.
- Review tasks/lessons.md at session start; add to it after any correction.
- UI edits: render/screenshot before done (curl+200 is not verification).
- Gate logic (delete/email/charge): tests same day — see tests/ for patterns
  (isolated temp DB via FMT_DB_PATH).
