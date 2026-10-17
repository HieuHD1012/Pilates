# Neon branches used by this deployment

- `production`: app database. On 2026-10-17 it received only the ADMIN account
  `admin@jpilate.com`; password is in local, gitignored `.env.production-admin`.
  No trainer, student, booking or demo sale was inserted into production.
- `deploy-demo`: disposable branch copied from production, expires
  2026-10-24 16:00 UTC. It contains 3 clearly labeled DEMO trainers and their
  generated portraits, 6 sample students, classes, packages and bookings.
  The branch credentials are in local, gitignored `.env.deploy-demo`.

To rebuild a fresh demo branch, create it with a short expiry, run
`neon deploy --branch <name> --no-env-pull`, pull Postgres and Object Storage
env vars into a gitignored file, then run a seeding script against that exact
branch. `seed_demo_branch.py` intentionally accepts only `deploy-demo`; update
its expected name only after verifying the new branch identity.

Do not put dummy students or sales in production. The public frontend release
gate also blocks invented studio contact facts. Demo data is for a preview with
an explicit DEMO label.
