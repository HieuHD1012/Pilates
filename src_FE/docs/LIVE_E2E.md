# Real API integration verification

## Commands and isolation

CI is the primary executable verification on Windows machines without a running
Docker daemon. `.github/workflows/ci.yml` installs Node 24, Python from the frozen
uv lock (>=3.12), `uv sync --frozen`, `npm ci`, PostgreSQL 16 and Mailpit. It checks
migrations, seeds a disposable ADMIN and serves the production FE artifact at
`http://localhost:4173` against FastAPI at `http://127.0.0.1:8000`.

The live job runs the complete browser suite twice, rebuilding the database
schema each time. It checks `/health` and an authenticated `/students` database
query. CORS and the reset-email URL use the FE origin above. Uploads are temporary.
No MSW or response interception is used. Account login and the operation being
tested happen through the UI; API calls prepare unique fixtures and verify results.

Windows local commands, from the repository root:

```powershell
powershell -File scripts/live-e2e.ps1 check
powershell -File scripts/live-e2e.ps1 setup
powershell -File scripts/live-e2e.ps1 run
```

`check` is read-only. `setup` installs locked dependencies and Chromium and starts
the dedicated Compose services. `run` resets only the owned live E2E database,
starts its own API process, runs two fresh rounds, reconciles all seven ledger
invariants, and stops its API process. It preserves the caller's environment.
Results use a unique `src_FE/visual-qa/live/local-<id>/` directory for each run.
The database remains a disposable Docker tmpfs service; stop it when finished:

```powershell
docker compose -p j-pilates-live-e2e -f docker-compose.live.yml down
```

| Service                | Local port  | Use                                               |
| ---------------------- | ----------- | ------------------------------------------------- |
| Development DB         | 5433        | Never used/reset by live tests                    |
| Backend pytest DB      | 5434        | Destructive pytest fixtures; never use the dev DB |
| Live E2E DB            | 5435        | `pilates_fe_test`, owned Compose project only     |
| Live SMTP / Mailpit UI | 1026 / 8026 | Avoid conflict with dev Mailpit                   |
| API / FE artifact      | 8000 / 4173 | Must be free before local run                     |

If WSL2 is unavailable, the user must enable it in an **Administrator** terminal
with `wsl --install`, complete any requested reboot, and enable Docker Desktop's
WSL2 engine. These privileged/reboot steps are not executed by the script. CI
does not require them. Install Node 24 and uv before `setup`.

## Standalone runner

`npm run e2e:live` requires an already prepared API/database and the following
environment. Missing configuration fails; it never skips required cases.

```text
ENVIRONMENT=test
DATABASE_URL=postgresql+psycopg://.../pilates_fe_test
LIVE_API_URL=http://127.0.0.1:8000
SEED_ADMIN_EMAIL=<disposable admin>
SEED_ADMIN_PASSWORD=<disposable password>
JWT_SECRET=<same disposable secret as API>
MAILPIT_URL=<local Mailpit URL>
```

Backend configuration must also set `CORS_ORIGINS=["http://localhost:4173"]`,
SMTP credentials/port, `STORAGE_DIR`, and
`PASSWORD_RESET_URL_TEMPLATE=http://localhost:4173/dat-lai-mat-khau?token={token}`.
The PowerShell and CI runners set these together. `LIVE_PYTHON` can override the
backend venv interpreter. Avoid partial `--grep` runs as release evidence: the
coverage gate correctly fails if required consumers were not exercised.

## Gates and evidence

1. `npm run verify`: type generation/typecheck, lint, unit tests, format,
   production build, prerender/fallback and product-content contract.
2. Backend lint, full pytest, controlled time/concurrency/authorization tests,
   migrations to head and `alembic check`, and time-sensitive tests under the
   studio timezone.
3. `check-api-contract.mjs`: 90 generated OpenAPI schemas vs FE types.
4. Playwright desktop covers every workspace screen and business operation.
   Mobile covers public/auth, student booking/profile/media/session workflows,
   and trainer attendance.
5. `check-live-coverage.mjs`: every business endpoint has a successful browser
   request from a passing UI test. Fixtures and verification API calls are
   excluded. No skipped/flaky/failed mandatory cases. `/health` is operational.
6. Two isolated fresh-database runs and seven ledger invariants after each run.

CI artifact `frontend-live-api` contains per-round HTML reports, failure
screenshots/traces, backend logs, JSON results, generated OpenAPI, and
`api-coverage.json`/`.md` with endpoint → actual passing UI cases.
Browser guards reject application exceptions, CORS errors and HTTP 5xx.
Expected 4xx resource errors belong to the validation/conflict/access/reset/rate
limit scenarios. Real offline transport failure is explicitly annotated and
must preserve input and permit retry. Separate race/admin browser contexts are
observed by the same guard.

Before upload, JWTs, password fields, reset URLs and fixture passwords are
redacted from text, trace ZIP resources and embedded HTML-report ZIP data.
Binary screenshots remain usable; password inputs are browser-masked.

The contract index is [API_VERIFICATION_MATRIX.md](API_VERIFICATION_MATRIX.md).
Its test groups describe coverage intent; the CI artifact proves which cases
actually passed. Never interpret endpoint bindings alone as verified workflows.

## Integration changes

- Added the ADMIN/STAFF announcement workspace, including draft/public filters,
  edit/publish/hide/delete confirmation and public cache invalidation.
- Made trainer creation/account linking, account edits, authenticated progress
  photos, portraits, catalogue edits, receipt details, unconfirmed receipts and
  class-size exports reachable through the existing UI primitives.
- Corrected account-create payload (no unsupported `trainer_id`), linked student
  phone defaults, reset-token 401 handling and prerender trailing-slash hydration.
- Trainer links validate existence, role and duplicate assignment, returning
  business errors instead of FK/unique 500s; non-null flags reject null.
- Every DB dependency now uses FastAPI function scope: commit/deferred constraints
  finish before HTTP success. A regression test reads a newly created student
  from another transaction at `http.response.start`.
- Offline mutations report failure immediately and retain input for explicit
  retry rather than silently queueing a transaction.

No new database migration or product clock endpoint is needed. Time fixtures
refuse databases other than `ENVIRONMENT=test /pilates_fe_test`; class/package
adjustments are restricted to E2E fixture records.

Merge into main only when all gates pass. Technical integration evidence does
not replace the separate release gate for missing real studio facts and photos.
