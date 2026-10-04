# Release checklist

Local frontend verification is required; it does not constitute production
approval. Use this checklist with the current API, deployment instructions and
studio acceptance. Record evidence against the release revision in CI or the
release record, rather than committing generated screenshots to source.

## Code and artifact gates

- Run `npm ci` on a supported Node version, then `npm run verify`.
- Run `npm run e2e -- --project=desktop --project=mobile --project=app`.
- Confirm all nine public routes and the SPA fallback in the production artifact.
- Confirm no mock worker or fixtures appear in the production artifact.
- Run `npm run check:release`; resolve every blocking content item.
- Review dependency audits. ESLint/accessibility-plugin compatibility must stay
  valid without force or legacy peer resolution. Track the Vitest 4 development
  advisories and a tested major migration; production dependency auditing alone
  is not an assessment of the development toolchain.

## Studio content and acceptance

- Supply the actual address, phone, Zalo and map link, with accountable owners
  and dates in `CONTENT_DEBT` in `app/content/studio.ts`.
- Replace all six concept photographs with approved studio assets. Recheck crop
  and focal point at 390/768/1024/1440px. Keep alt text accurate.
- Confirm public class ratios, duration, opening hours and policies. Actual class
  capacity and booking/refund decisions remain backend-owned.
- Accept enquiry, booking, attendance, receipts, renewals and reporting workflows
  with the people who will operate the studio.

## Controlled real-API checks

Use a disposable database or controlled staging data. The CI live project covers
student booking/cancellation ledger effects, a forbidden report request and
reload without a mock worker; additional cases remain necessary:

- Last-seat races, duplicate submission, exhausted/expired packages, exact
  cancellation boundaries and concurrent rescheduling conflicts.
- Recurrence preview versus commit, known skipped conflicts, write-time rollback
  and class cancellation refunds.
- Sale/renewal/confirm/VOID/adjustment reconciliation and uncertain-write recovery.
- Account activation/reset expiry, locked accounts, roles and object permissions.
- Every private-photo read/upload/delete case, retention/consent and file access.
- Export scope, date boundaries, Vietnamese encoding and formula-injection safety.

## Session and operational scale

- Bearer credentials remain in localStorage. Any HttpOnly/Secure cookie change
  requires backend, CSRF, SameSite and CORS coordination.
- Test session refresh/logout/account change across supported browser engines
  and multiple tabs.
- Resolve capped arrays without pagination for classes, eligibility, schedules,
  rosters and renewals. Warnings/errors do not prove result completeness.
- Review renewal candidates (default 200) and contact history (default 50) scope.
- Measure complete directories with representative studio data before further
  caching or indexing changes.

## Host, usability and operation

- Verify HTTPS, API routing, CORS, private file no-store, noindex, asset 404s,
  HTML/static caching and a CSP compatible with hydration scripts.
- Check keyboard/focus, screen-reader labels, zoom, long content, pending/error
  states and actual-device performance.
- Establish redacted monitoring, ownership and support procedures.
- Deploy complete versioned artifacts atomically and exercise rollback with
  compatible FE/BE contracts and retained referenced assets.

See [deployment](DEPLOYMENT.md), [business rules](BUSINESS_RULES.md),
[product scope](PRODUCT.md) and [open decisions](OPEN_QUESTIONS.md).
