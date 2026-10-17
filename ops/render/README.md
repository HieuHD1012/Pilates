# Render Free API deployment

`render.yaml` defines one FastAPI web service in Singapore using the existing
Dockerfile. PostgreSQL and private images remain on Neon; R2 holds independent
backups. The service runs one Uvicorn process because the login limiter is
in-process.

## Demo first

1. The `j-pilate-api-demo` Free service is deployed from this branch at
   `https://j-pilate-api-demo.onrender.com`, with automatic deploys off.
2. It uses the *demo branch's* pooled `DATABASE_URL`, S3 endpoint and credentials,
   and `CORS_ORIGINS` contains the Pages demo origin. Do not reuse production
   Neon credentials for demo.
3. The demo branch already has migrations and seed data. Check `/health`, a
   public trainer image, and an authenticated booking after each API deploy.
4. Build `src_FE` with `VITE_API_BASE_URL` set to the Render demo origin and
   `VITE_ENABLE_MSW=false`; run `npm run verify`. Copy
   `build/client/__spa-fallback.html` to `build/client/404.html`, then run
   `wrangler pages deploy src_FE/build/client --project-name=j-pilate --branch=demo`.
   The current preview is `https://demo.j-pilate.pages.dev`. Test a hard
   refresh, login, schedule, booking and image load there.
5. GitHub variable `PILATES_DEMO_API_ORIGIN` is already set. The optional Pages
   workflow needs a separate `CLOUDFLARE_API_TOKEN` with Account → Cloudflare
   Pages → Edit. Until then, deploy preview builds manually with Wrangler.

For a production release, create a separate `j-pilate-api` service from
`render.yaml`. Set `PILATES_API_ORIGIN` to its HTTPS origin. Connect production
Neon only after CI, migrations, reconciliation and a backup/restore rehearsal.
Set `CORS_ORIGINS` to the production Pages origin and keep `ENVIRONMENT=prod`.
The frontend's public-content gate still applies.

## Free plan constraints

- An idle service sleeps after 15 minutes; the next request can take about a
  minute to wake it. Free instances can restart and have an ephemeral local
  filesystem, so `STORAGE_BACKEND=s3` is mandatory.
- Free instances cannot use Render's pre-deploy command or one-off jobs.
  Run Alembic with Neon's direct URL and ledger reconciliation from an external
  runner before deploying a new API revision. Leave auto-deploy off until that
  sequence is automated.
- Outbound SMTP on ports 25, 465 and 587 is blocked. The backend supports
  `RESEND_API_KEY` to send password-reset mail over HTTPS. A verified sending
  domain, `EMAIL_FROM`, and `PASSWORD_RESET_URL_TEMPLATE` are required before
  real users rely on password reset. Test delivery and the link end to end.
- The existing login limiter uses process memory. The single Free instance
  preserves its limit while running, but counters reset after sleep/restart.
  Before public release, move anonymous endpoint limits to shared storage or
  place a verified edge rate limit in front of the API.

No Render Postgres database is created: its Free database expires after 30 days.
