# Deploying find-my-trainer to Cloudflare (Workers + D1)

The goal: run the app entirely on Cloudflare — **Workers** (via OpenNext) for the
Next.js server and **D1** (Cloudflare's serverless SQLite) for the database.

D1 *is* SQLite, so the schema and SQL carry over directly (see
[`migrations/`](./migrations)). The one structural change is that D1 is accessed
**over the network (async)**, while local dev keeps using **better-sqlite3**
(synchronous, fast) through a shared adapter.

## Migration status

- [x] N+1 activity lookup batched (keeps D1 row-reads low)
- [x] D1 migrations: schema (`0001_init.sql`) + taxonomy seed (`0002_seed_taxonomy.sql`)
- [x] Async data layer + SQLite/D1 adapter (`lib/database.ts`)
- [x] OpenNext + `wrangler.toml` + build/deploy scripts
- [x] Rate limiting moved to KV (`lib/ratelimit.ts`); in-memory fallback locally
- [ ] First deploy (needs your account — steps below)

## One-time setup (you)

1. Create a free **Cloudflare account** → https://dash.cloudflare.com/sign-up
2. Install the CLI is already handled via devDeps; authenticate once:
   ```bash
   npx wrangler login
   ```
3. Create the D1 database and copy the printed `database_id` into `wrangler.toml`:
   ```bash
   npx wrangler d1 create find-my-trainer
   ```
4. Create the KV namespace for rate limiting and copy its `id` into
   `wrangler.toml` (the `RATE_LIMIT` binding):
   ```bash
   npx wrangler kv namespace create RATE_LIMIT
   ```

## Apply migrations

```bash
# local emulator DB (for wrangler dev), then the real remote DB
npx wrangler d1 migrations apply find-my-trainer --local
npx wrangler d1 migrations apply find-my-trainer --remote
```

## Environment variables (set as Worker secrets, not in code)

```bash
npx wrangler secret put ADMIN_KEY            # a long random string (never "letmein")
npx wrangler secret put RESEND_API_KEY       # optional, for real emails
npx wrangler secret put EMAIL_FROM           # alerts@yourdomain.com
# NEXT_PUBLIC_SITE_URL + EXPOSE_DEV_OTP=false + ENABLE_CLAIMS go in wrangler.toml [vars]
```

## Build, preview, deploy

```bash
npm run cf:build     # OpenNext build for Cloudflare
npm run cf:preview   # run the Worker locally against local D1
npm run cf:deploy    # deploy to Cloudflare
```

## Domain + front-of-app services

Add your domain in the Cloudflare dashboard and bind the Worker to it. You then
get DNS, CDN, automatic HTTPS, DDoS protection, and **Turnstile** (bot
protection) on the free plan — all in the same account.

## Cost (this scale)

~**$0–5/month** + ~$10/yr domain. Pages/Workers and D1 free tiers cover up to
~100k visits/mo; Workers Paid ($5/mo) only if you want headroom. Map tiles stay
free (OpenFreeMap). Avoid Google Maps (it would dwarf this).

## Notes / gotchas

- **Don't** seed the sample trainers in production — `0002_seed_taxonomy.sql`
  intentionally seeds only activities + areas. Real trainers come from users.
- Local dev (`npm run dev`) and tests keep using `data/app.db` (better-sqlite3)
  via the adapter — no Cloudflare account needed to develop.
- The in-memory rate limiter must move to KV before launch (a single Worker
  isolate doesn't share memory) — tracked above.
