# J Pilates frontend production review plan

Prepared on 2026-10-03 against `main`, application commit `2451764`.

This plan evaluates whether the approved interface can reliably operate a real
Pilates studio. Preserve the final layout and beige, brown and copper design.
Review public pages, authentication, student workflows, trainer workflows and
ADMIN/STAFF operations. Backend policies remain authoritative.

**Current decision: production readiness is not established.** The release
content gate fails today. Other critical areas require evidence from the built
frontend connected to a real staging API. This is an initial evidence review and
an execution plan, not a completed audit of every route or a security assessment.

## Current evidence

| Area | Observed evidence | Assessment |
|---|---|---|
| Code baseline | The preceding verification of this application version passed typecheck, lint, 66 tests, production build and the nine-route prerender contract. | Useful baseline; it does not cover all production gates. |
| Architecture | React Router framework mode, `ssr:false`, selective prerender, one API adapter and TanStack Query. Booking mutations wait for the server; logout clears the query cache. | Appropriate foundations for this application; detailed behavior still needs review. |
| Release content | `node scripts/check-content-placeholders.mjs --release` returned exit 1 during this review. Address, phone, Zalo and map are missing without owner/due date; six concept photographs are referenced. | Confirmed release blocker. |
| CI | `.github/workflows/ci.yml` contains a backend job and no frontend job. | The frontend baseline and release gates are not enforced by this workflow. External deployment controls have not been inspected. |
| Business specification | `docs/PRODUCT.md` states an eight-hour private cancellation window; `app/content/studio.ts` and `src_BE/app/domain/rules.py` use one hour. The product document also describes progress photos as not implemented, while adapters and the student-detail view exist. | Reconcile specifications, implementation and owner decisions before assessing functional completeness. |
| Session storage | `app/lib/api/tokens.ts` persists access and refresh tokens in localStorage. | Confirmed design choice with an XSS exposure risk; review with the backend and deployment owner. No exploitable XSS has been demonstrated. |
| Browser evidence | The Playwright `app` project targets development, where MSW is normally enabled. Production-artifact projects are separate. Historical real-API testing is documented, but no current staging result was established in this review. | Mock flow tests cannot close the production integration gate. |
| Performance and operations | No performance measurements, deployed security headers, monitoring receipts or rollback drill were established. `chunkSizeWarningLimit:400` configures a warning. | Unverified; a chunk warning is not a failing bundle-budget gate. |

Repository documents contain historical statements. A document's “done” status
must be checked against current code, API behavior and the confirmed release
scope. Do not infer missing features solely from an old open-question table.

## Review order and deliverables

Run these passes in order. Each pass produces findings before fixes are proposed.
Assign owners when findings are recorded; do not invent commitments or deadlines.

| Pass | Review work | Deliverable and exit condition |
|---|---|---|
| 1 Business and release scope | Reconcile current policies, role permissions, enabled features, content debt and source documents. Inventory every route and mutation. | A feature/role/API matrix; every critical rule has a source or an explicit unresolved decision. |
| 2 Transactions and contracts | Trace booking, cancellation, rescheduling, package sale, payment state, ledger adjustment, recurrence and attendance from UI through API to refreshed read views. | Reproducible cases and an invalidation matrix; no confirmed critical inconsistency remains. |
| 3 Authentication and privacy | Review sessions, refresh, account switching, object access, photos, exports, redirects, input rendering and deployment headers. | Security findings distinguished from design risks; required FE/BE changes or documented decisions. |
| 4 Screens and accessibility | Review each route and its dialogs/tabs under normal, loading, empty, error, pending, conflict and long-content conditions. | A route checklist with screenshots and keyboard evidence. Final composition stays intact. |
| 5 Performance and maintainability | Measure production routes and operational workloads; inspect network waterfalls, pagination, render work, images, fonts, route boundaries and duplicated logic. | Measured hotspots and prioritized improvements, with a baseline for each proposed optimization. |
| 6 Production delivery | Run the built frontend against staging, verify actual host behavior, environment, CI, content, monitoring and recovery. | Staging test results tied to FE/BE versions; release gate receipts and a rollback procedure. |
| 7 Readiness decision | Recheck changed risks and summarize unresolved items. | A release decision based on the gates below, with named owners for accepted noncritical debt. |

Review correctness of money, sessions, seats and access before cosmetic refactors.
Test shared patterns once comprehensively, then check their route-specific uses.
Repeat tests when a change affects a concrete risk or a mandatory gate; do not
repeat broad suites just to increase test counts.

## Required business scenarios

For each row, record the actor, endpoint, expected server outcome, visible result,
affected query families and an automated or manual staging test.

| Workflow | Cases that must be proved |
|---|---|
| Authentication and accounts | Four roles; expired/revoked access; concurrent 401s; multiple tabs; refresh failure; logout during an in-flight request; account A to B without showing A's cached data; invitation/reset success, expired token and invalid input; safe `next` redirect. |
| Public consultation | Valid submission, field errors, duplicate click, network loss and uncertain outcome; preserve entered details and selected class/package context; no promise of an appointment when only a lead was created. |
| Student booking | Eligible and ineligible package, exhausted/expired balance, wrong class format, full/cancelled class, duplicate booking and two users competing for the last seat. UI success requires server acceptance. |
| Cancellation and rescheduling | Before, exactly at and after the server cutoff; local/studio time boundaries; server denial; target class filled after selection; no apparent successful move when the original booking was retained. Show the server's refund consequence. |
| Staff scheduling | Trainer overlap, reassignment, invalid time range, recurrence preview versus committed occurrences, skipped conflicts, repeated click and class cancellation with enrolled students. Verify downstream schedules and ledger effects. |
| Packages and payments | Create/sell/renew using snapshots and authoritative validity; cash/bank transfer; PENDING/CONFIRMED/VOID consequences; repeat confirm/void; totals and report period consistent with the server; no unintended online-payment promise. |
| Session ledger | Correct person and package, reason and actor for adjustment, server refusal, authoritative closing balance, chronological entries, booking/refund reconciliation and the confirmed policy on negative balances. |
| Attendance | Correct trainer and roster, permitted roles, present/absent corrections and related reports; repeat save and another user's concurrent edit. |
| Leads and renewals | Save follow-up, convert once without creating duplicate people, relationship after conversion, renewal reason/threshold/date semantics and contact history. |
| Reports and exports | Date range validation, timezone boundaries, confirmed-payment revenue, null versus zero, correct units, access control, export scope, Vietnamese encoding and spreadsheet formula-injection cases. |
| Progress photos | Direct API access for every role and another student's ID; protected bytes; upload validation; deletion rights; object-URL cleanup; confirmed consent, retention and deletion policy. |
| Waitlists and other disputed scope | Determine what current code/API actually support and what the owner authorizes. If excluded from launch, keep the scope exclusion explicit and remove unsupported promises. |

Use a controlled staging database with resettable test data. Test destructive
cases there, not against production student records. FE review includes observing
backend outcomes, but does not silently change backend policy.

## Acceptance standards

| Area | Passing standard | Evidence |
|---|---|---|
| Architecture | Retain React Router framework mode, selective prerender and the static deploy contract. Domain decisions have one owner. UI primitives have no API knowledge; route length alone is not a reason to refactor. | Code paths, ADR compliance, build contract and deep-link tests. |
| API contracts | Methods, payloads, enums, nullability, dates, money strings and error bodies match the current API. Endpoint-coverage tests are supplemented by payload and behavior tests. | FE/API mapping and real response fixtures from controlled staging. |
| Query state | Keys include the relevant identity/filter/range. Success updates or invalidates every affected resource. Late responses cannot expose an earlier identity's records. Focus/refetch and filter changes retain context without presenting stale data as current. | Mutation-to-query matrix and race/account-switch tests. |
| Writes and recovery | Prevent duplicate submission while pending; mutations are not automatically retried when the outcome is uncertain. Conflicts, validation, 403, 429, 5xx and offline failures have actionable states. A response from the server determines success. | Failure injection plus staging reconciliation after reconnect. |
| Roles and privacy | Frontend role gates provide UX; backend enforces roles and object access. Private photo/export access cannot be bypassed with a URL or ID. No secrets or personal data in public bundles, URLs or telemetry. | Negative permission tests and deployed security review. |
| Forms and access | Labels, errors, keyboard focus, dialogs, pending announcements and password autofill work. Review WCAG 2.2 AA with both automated checks and manual testing. Check 390/768/1024/1440 widths, browser zoom, long Vietnamese names and touch interactions. | Axe, keyboard/screen-reader checks and targeted screenshots; zero axe findings alone is insufficient. |
| Operational scale | Lists handle data beyond API limits; search/pagination do not silently omit eligible people/classes. Large reports and rosters remain usable without unnecessary per-row requests. | Representative studio workload plus a stress dataset above list limits. |
| Performance | Establish budgets from the built app and intended devices. Target LCP <=2.5s, INP <=200ms and CLS <=0.1 at the 75th percentile, separately for mobile and desktop field data. Prelaunch lab results are provisional evidence. | Production-build traces, network timings, render profiles and postlaunch field monitoring. |
| Delivery | HTTPS, actual API origin, CORS, compatible security headers and cache rules verified on the target host. Public prerender works; private deep links use the SPA fallback; private routes remain noindex. Production contains no active mock worker or fixture responses. | Host-level smoke tests and artifact inspection, not just Vite dev. |
| Observability and recovery | Record failures with release/context identifiers and redacted data. A failed consultation, booking or payment operation can be diagnosed. Deployment rollback is executable and does not pair incompatible FE/BE versions. | Redacted error event, health/smoke checks and rollback drill. |
| Maintainability and dependencies | Typecheck/lint clean; behavior-focused tests for critical domain paths; safe and justified dependencies; no suppression that hides unresolved defects. Refactor or memoize only where reuse or measured work warrants it. | Targeted code findings, dependency triage and regression evidence. |

The localStorage token design deserves an explicit security decision. OWASP
advises against storing session identifiers in JavaScript-readable localStorage.
Evaluate a Secure/HttpOnly cookie design with the backend, including CSRF,
SameSite and cross-origin constraints. CSP can reduce exposure but does not make
localStorage HttpOnly. Do not claim that changing FE storage alone resolves the
session architecture. [OWASP storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#storage-apis)

Awaiting relevant invalidations can keep a mutation pending until its read views
are refreshed; choose that behavior where users rely on the next visible balance,
seat count or status. [TanStack mutation guidance](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations)

Core Web Vitals targets above come from [web.dev](https://web.dev/articles/vitals).
Lighthouse alone cannot establish field INP or field performance. Bundle budgets
are project decisions and must specify compressed/uncompressed size and routes;
Vite's [chunk-size warning](https://vite.dev/config/build-options.html#build-chunksizewarninglimit)
is not a release rejection mechanism.

## Screen review procedure

For every route and meaningful dialog/tab:

1. Identify the role, task, API resource and primary action.
2. Read the code and backend contract; identify any duplicated business decision.
3. Trace data loading and the loading/empty/error/refreshing states.
4. Execute a normal transaction and verify every affected read view.
5. Exercise the relevant denial, boundary, double-submit and interrupted-network cases.
6. Verify permissions, focus, labels, mobile layout and long content.
7. Inspect requests and render work; record measured problems rather than assumptions.
8. Record PASS, FAIL, UNKNOWN or DEFERRED with evidence and the next required action.

DEFERRED means a noncritical item with an owner and due date, or a documented
feature excluded from the release. An UNKNOWN critical case blocks readiness.
Screenshot review does not substitute for transaction verification.

## Release gates and severity

- **P0:** demonstrated unauthorized access, sensitive-data exposure, or corruption
  of payments, sessions or booking state. Stop release and address the cause.
- **P1:** a critical journey fails, contradicts policy, has unresolved security
  design, or lacks required integration evidence. Blocks release until resolved
  or the affected feature is explicitly excluded from scope.
- **P2:** bounded usability, maintainability or performance debt with a working
  critical path. May be scheduled with an owner, impact statement and due date.
- **P3:** minor polish or optional improvement. Does not displace transaction work.

A release requires all of these:

1. `npm run verify` passes on the exact candidate commit.
2. `npm run check:release` passes; studio facts, real photos and provisional public
   policies are confirmed under the repository's release rules.
3. Production artifact smoke tests and critical workflows pass against the real
   staging API, with FE/BE versions recorded and mocks disabled.
4. No unresolved P0/P1 or UNKNOWN critical evidence remains. Scope exclusions are
   explicit and the UI does not offer the excluded workflow.
5. Host routing, cache/security configuration, monitoring and rollback are verified.
6. The owner/staff completes a short acceptance session: receive a lead, create a
   student, sell a package, record payment, book/cancel a class and reconcile sessions.

The proposed CI structure has a frontend PR job (`npm ci`, verify and applicable
artifact/mock tests), an integration job using a real test API/database, and a
deployment gate for staging smoke tests and `check:release`. Missing studio
content should block deployment, not make every development PR permanently red.
External CI or hosting arrangements must be inspected before finalizing this setup.

## Finding format and final report

Each finding contains: ID, severity, status, affected role/workflow, file and line,
reproduction, expected/actual outcome, source of the business rule, impact, proposed
fix, owner, and verification needed to close it. Distinguish observed defects,
design risks and missing evidence.

The completed audit should produce a route/feature matrix, a prioritized backlog,
a reconciled policy/permission matrix, staging test receipts, performance baseline
and a readiness report. Readiness is a gate decision; an overall score cannot
average away a security or transaction failure.

## Starting files

- `AGENTS.md`, `docs/REFERENCE_LOCK.md`, `docs/PRODUCT.md`, `docs/OPEN_QUESTIONS.md`
- `docs/API_MAPPING.md`, `docs/api/`, `../src_BE/app/domain/rules.py`
- `app/lib/api/client.ts`, `tokens.ts`, `schema.ts`, `query-keys.ts`, `endpoints/`
- `app/lib/query-client.ts`, `app/features/auth/`, `booking/`, `commerce/`, `schedule/`
- `app/routes/`, `app/layouts/`, `app/ui/`, `app/content/studio.ts`
- `playwright.config.ts`, `e2e/`, `scripts/check-build-contract.mjs`
- `scripts/check-content-placeholders.mjs`, `docs/DEPLOYMENT.md`, `../.github/workflows/ci.yml`

React Router's [SPA guidance](https://reactrouter.com/how-to/spa) is a framework
reference. The actual emitted artifacts and repository build-contract test decide
the correct fallback path for this particular prerender configuration.
