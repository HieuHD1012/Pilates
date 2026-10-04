# J Pilates frontend review and refactor

Reviewed on 2026-10-03–04 against `main` commit `ef557b5`, following
[FE_PRODUCTION_REVIEW_PLAN.md](FE_PRODUCTION_REVIEW_PLAN.md).
Implementation branch: `codex/fe-production-review`, in a separate managed
worktree. The primary `main` checkout was not modified.

**Decision: local FE changes are reviewable; production approval is still open.**
The approved visual system remains intact. New controls cover pagination and
history months; no new framework, runtime, dependency or backend policy was added.

## Findings and completed changes

P1 means a transaction, privacy or release integrity risk; P2 means incorrect
feedback, scale handling or maintainability. These priorities describe the
observed code paths, not a demonstrated remote exploit.

| Priority | Finding                                                                                                                | Refactor and regression evidence                                                                                                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | A transient refresh failure discarded credentials; requests could finish under an account that had since ended         | Distinguish 401 from 429/5xx/offline, preserve retry, serialize refresh, reject late responses. Check storage even before delayed cross-tab events. Auth race tests include logout and another tab changing account during refresh.                              |
| P1       | Clearing cache did not replace mounted query observers                                                                 | Identity boundaries clear QueryClient and remount route observers; same-tab rotation preserves data. Mounted Account A → B and login/navigation tests exercise the real root.                                                                                    |
| P1       | Balance/refund/attendance writes omitted dependent eligibility, dashboard, renewal and public readers                  | Shared awaited resource matrix in `app/lib/api/invalidation.ts`; behavior tests verify actual hooks, dependent observer completion and unchanged private-photo cache.                                                                                            |
| P1       | Payment parsing removed non-digits, so negative/fractional inputs could become positive amounts                        | Strict whole-VND grammar, valid grouping, nonnegative/safe representation and the database Numeric(12,2) ceiling. UI tests reject -100, fractions/exponents and do not POST.                                                                                     |
| P1       | The production asset graph emitted MSW/fixtures in a lazy browser chunk (~164.76 KB gzip) despite a false runtime flag | Direct DEV guard at the import site, copied worker removed during build, all client JS scanned by the artifact gate. The browser mock chunk is absent. This was development data, not demonstrated customer-data leakage.                                        |
| P2       | Forms could be dismissed/reopened while the original write still ran                                                   | Caller-owned busy state prevents Escape/outside/close dismissal; cancel controls disabled. Dialog content moved beside child-owned sale/renewal/edit/conversion mutations without changing its layout. Delayed receipt E2E verifies dismissal blocking.          |
| P2       | Duplicate student phone used an obsolete error code                                                                    | Match `STUDENT_PHONE_TAKEN`, render against the phone field; unit and duplicate-creation E2E cover it.                                                                                                                                                           |
| P2       | Lists and selectors silently stopped at API defaults                                                                   | Server offset controls for people/accounts/payments; complete offset directories for students/trainers/packages. Student payment tab also paginates. No invented total count.                                                                                    |
| P2       | History fetched the first 500 lifetime records; old rows could hide current activity                                   | Active schedule starts today in +07:00; history has month boundaries/picker and a 500-row warning. Single-class booking lookup uses that class's time range.                                                                                                     |
| P2       | Calendar weekly bookings capped at 500 could undercount later classes                                                  | Fall back to authoritative per-class detail counts only at the cap, with six concurrent requests maximum. Test puts a booked class beyond the first 500. Filtered totals use visible classes; failed/placeholder counts are not displayed as measured occupancy. |
| P2       | Capped eligibility could incorrectly imply that omitted class IDs were ineligible                                      | Stop with an explicit incomplete-result error at the 300 limit. An error while choosing a replacement class renders retry rather than “no eligible class.” Backend pagination is still needed for workloads over this cap.                                       |
| P2       | Private blob URLs survived replacement/removal/cache clear                                                             | QueryCache owns/revokes object URLs; cancelled binary requests cannot create abandoned URLs. Photo replacement/deletion/logout tests cover ownership.                                                                                                            |
| P2       | Public date could remain on yesterday in an open tab                                                                   | Studio date subscription updates on timer/focus/visibility without using build-time dates for prerendered HTML.                                                                                                                                                  |
| P2       | Form guards and documentation contradicted current contracts                                                           | Remove invented 15-minute, capacity-40, adjustment-100 and 26-week limits; align reset hint and adjustment reasons. Reconcile Group 4h/Private 1h, role names, self-service, photo access, VOID and waitlist exclusion.                                          |
| P2       | Local host fell back to HTML for missing assets/API paths; CI had no FE job or hard byte budget                        | Explicit asset 404/API failure, path confinement, MIME/cache headers; FE verify/artifact/UI job and disposable live-API job; gzip budget in mandatory verify.                                                                                                    |

Recurrence has two distinct behaviors: commit recomputes known conflicts and
omits them; the remaining set commits atomically. A database overlap during that
write rolls back the set. The FE does not impose a new “all preview rows or none”
policy. Backend source was checked directly, including `api/classes.py` and
`services/recurrence.py`; API docstring wording alone is not sufficient.

## Local verification

The complete E2E run passed on frozen behavior. A final registry cleanup moved
unchanged invalidation prefixes into `query-keys.ts`; mandatory verify was rerun
after that cleanup. Logs are kept in the
ignored `src_FE/visual-qa/production-review/` directory.

| Gate                                   | Result                                           | What it proves                                                                                       |
| -------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `npm run verify`                       | PASS: 19 files / 108 tests; exit 0               | Typecheck, lint, unit/component tests, production build, contract, byte budget and content code gate |
| Playwright desktop/mobile/app          | PASS: 89 tests (34 artifact, 55 fixture); exit 0 | Built static routing/public checks plus fixture-driven operational behavior                          |
| Production dependency audit            | PASS: 0 advisories from `npm audit --omit=dev`   | Registry audit of installed production dependencies on this date; not a security assessment          |
| `npm run check:release`                | FAIL, exit 1                                     | Four required facts lack owner/due; six temporary concept photos remain                              |
| Disposable built-FE/real-API flow      | NOT EXECUTED locally                             | Docker engine pipe remained unavailable; no customer database was used                               |
| Deployed performance/security/rollback | NOT VERIFIED                                     | No target-host field data, headers, monitoring receipt or rollback exercise                          |

Measured production JavaScript gzip: largest chunk **57,136 bytes**, all chunks
**353,621 bytes**, homepage external script/preload references **186,255 bytes**.

The gzip ceilings are regression budgets (80/400/200 KiB), not measured Web
Vitals or a complete initial request graph. Initial auth regression tests failed
before the fixes; final results are not based on unchanged passing tests alone.
Historical E2E tests were updated to numeric IDs, uppercase roles and actual
supported actions; unsupported staff booking/class-edit scenarios were replaced
by checks that those controls are absent. No production gates were bypassed.

## Screen coverage

`e2e/route-audit.app.spec.ts` captures normal-state screenshots and checks
JavaScript errors, route access, overflow and axe on 28 operational route bodies
at 1440px. It excludes index redirects. Feature specs cover transactions and
selected failure states. Existing public checks cover the artifact and
390/768/1024/1440 overflow; UI clusters check selected flows at 390/1440.

| Surface                                                  | Normal-state inventory                                                                     | Targeted local behavior                                                                    | Still required on staging/with owner                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Public nine prerender routes                             | Build contract; navigation/SEO; eight axe pages (promotions not included in that axe list) | Package/class context into enquiry, field validation, mobile overflow                      | Valid/duplicate/uncertain lead submission, real contacts/assets and conversion acceptance              |
| Login/forgot/reset                                       | Source/adapter, noindex/deep-link and form tests; not a full auth screenshot matrix        | Session errors/retry, race/redirect/login navigation, reset length hint                    | Real reset/activation expiry/mail/lockout and deployed cookie/token decision                           |
| Student classes/detail/schedule/history/packages/account | Six route bodies                                                                           | Book/change/cancel confirmation, response-owned balance, history month, cap/error handling | Last seat, exact cutoff, exhausted/expired packages, late reschedule conflict and all failure recovery |
| Trainer today/schedule/class/profile                     | Four route bodies                                                                          | Role separation, attendance mutation invalidation                                          | Real assignment/privacy, attendance timing/corrections/concurrency and profile effects                 |
| Staff dashboard/calendar/class                           | Three route bodies                                                                         | Create class, explicit timezone, recurrence validation, cancellation reason, cap overflow  | Real conflicts/refunds and preview-versus-commit drift reconciliation                                  |
| Staff leads/students and detail                          | Four route bodies                                                                          | Create/update/duplicate/convert, student financial/history tabs                            | Large datasets, follow-up/renewal semantics and actual object permissions                              |
| Staff trainers/catalogue/payments/ledger/renewals        | Six route bodies                                                                           | Complete selectors, receipt/confirm/adjust, pending dismissal                              | Sale/renewal/VOID combinations, nonnegative ledger and cross-user reconciliation                       |
| Staff report index/revenue/classes/trainers/accounts     | Five route bodies                                                                          | CSV download initiation, invitations and ADMIN-only account UX                             | Export contents/encoding/formula safety, period edges and backend negative permission cases            |
| Private photo tab                                        | Shared query/URL lifecycle reviewed/tested; not a separate route audit case                | Replacement/deletion/cache-clear cleanup                                                   | Every role/object/file access case, consent, retention, upload validation and destruction              |

Screenshots are in `test-results/route-audit.app-*/screen.png` and uploaded by
CI with Playwright results. They are ignored generated evidence, not production
assets. Representative payment/history/trainer-calendar captures were visually
inspected; this is not a claim of manual visual/keyboard/screen-reader acceptance
for every route, dialog, zoom level and long-content condition.

## Remaining release gates and follow-up order

1. **Content and owner acceptance:** supply address/phone/Zalo/map, accountable
   content owners and dates; replace/approve real photography and confirm
   provisional ratios/hours/duration/policies. Do not assign fictitious owners.
2. **Run controlled real-API evidence:** execute the new CI live job, then the
   plan's permission/photo/export/cutoff/concurrency/uncertain-write scenarios.
   The harness currently covers student booking/cancellation ledger effects,
   a forbidden report request, reload and absence of a mock worker; it is not
   the whole acceptance matrix. Backend policy code was not changed here.
3. **Session architecture decision:** localStorage bearer credentials remain
   JavaScript-readable. HttpOnly/Secure cookies require backend/CSRF/SameSite/CORS
   coordination; CSP alone does not resolve storage exposure. Multi-tab browser
   tests on the actual supported engines are still needed beyond unit seams.
4. **Operational scale:** classes/eligibility/my-schedule/renewals/rosters expose
   capped arrays without offset. Some caps now fail/warn explicitly; this does
   not make all workloads complete. Renewal candidates (default 200) and contact
   history (default 50) still need a pagination/recent-history scope decision.
   Complete directories trade additional page reads for correctness; measure
   them at representative studio scale before adding caching/index abstractions.
5. **Production host and usability:** verify HTTPS/API/CORS/cache/security policy,
   all required pending/error/keyboard/zoom/long-content states, actual-device
   timings, redacted observability and compatible atomic deployment/rollback.
   Record owner workflow acceptance after these checks.

No push, merge or production deployment is implied by local test success.
The next release decision must be based on these remaining receipts, not on
historical “all delivered” statements or the number of passing fixture tests.

## Portable local setup follow-up — 2026-10-04

The owner authorized merging the reviewed FE into main and fixing fresh-machine
startup. Strict install reproduction returned `ERESOLVE`: ESLint 10.8.1 was
outside `eslint-plugin-jsx-a11y`'s supported peer range. The existing
`legacy-peer-deps=true` hid that conflict. `.nvmrc` selected Node 22.12.0 although
jsdom 30 requires 22.22.2 / 24.15 or newer supported releases.

- Align ESLint and `@eslint/js` to 9.39.5, preserving accessibility checks and
  architectural lint rules. ESLint 9 emits a support/deprecation warning;
  migration to 10 requires an accessibility plugin that declares compatibility.
- Enable strict engines and normal peer resolution. Declare the full Node
  requirement, recommend Node 24 LTS, and add portable install/dev/build runtime
  diagnostics. No globally installed Vite or React Router is needed.
- Rebuild the npm lockfile with ordinary resolution. Apply compatible transitive
  patches to brace-expansion and undici. Production audit remains zero; the
  installed Vitest 4 toolchain retains three moderate development advisories.
  A Vitest major migration is a separate tested change, not a forced install.
- Correct README setup and `.env.example`: default FE demo requires no backend
  or `.env`; real API mode needs an absolute API URL/CORS or a configured proxy.

Verification used a new source snapshot including the repository's API docs,
with no existing node_modules, build artifacts or local environment file:
`npm ci` passed; `npm ls --all` returned zero; `npm run verify` passed all 108
unit/component tests and build gates. A focused fresh-install E2E run passed
21 tests against the built public artifact and the npm-started development
server (public, deep links, login route and staff receipt/ledger behavior).
This was verified on Windows with Node 24.19.0/npm 10.9.0. Linux remains covered
by the committed CI jobs when they execute; it was not run locally here.

The requested main merge does not close the remaining production release gates
listed above.
