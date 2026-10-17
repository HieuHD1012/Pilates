# Render Free API deployment

`render.yaml` defines one FastAPI web service in Singapore using the existing
Dockerfile. PostgreSQL and private images remain on Neon; R2 holds independent
backups. The service runs one Uvicorn process because the login limiter is
in-process.

## Demo first

1. Connect `HieuHD1012/Pilates` to Render and create the Blueprint from this
   branch. Use the `j-pilate-api` Free service. Keep automatic deploys off.
2. Enter the *demo branch's* pooled `DATABASE_URL`, S3 endpoint and credentials,
   and `CORS_ORIGINS` as a JSON array containing the Pages demo origin. Render
   generates `JWT_SECRET`. Do not reuse production Neon credentials for demo.
3. The demo branch already has migrations and seed data. Deploy the service,
   then check `/health`, a public trainer image, and an authenticated booking.
4. Set GitHub variable `PILATES_API_ORIGIN` to the Render HTTPS origin and
   dispatch `Deploy frontend to Cloudflare Pages` with `release_public=false`.
   Test a hard refresh, login, schedule, booking and image load on the Pages URL.

For a production release, switch the API to production Neon credentials only
after CI, migrations, reconciliation and a backup/restore rehearsal. Replace
demo credentials, set `CORS_ORIGINS` to the production Pages origin, and keep
`ENVIRONMENT=prod`. The frontend's public-content gate still applies.

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
