# Current business and API rules

Reconciled on 2026-10-04 against the backend in the same checkout. These are
implemented contracts, not new owner approvals. Historical workbook proposals
must not override the current API. A policy change requires a backend decision.

## Roles and transactions

- Roles are `ADMIN`, `STAFF`, `TRAINER`, `STUDENT`. Frontend role gates are UX;
  backend role and object permissions remain the security boundary.
- Booking, cancellation and rescheduling are student self-service endpoints.
  Staff can inspect rosters; there is no supported booking-on-behalf action.
- One trainer per class. Overlapping assignments are rejected by the backend;
  back-to-back half-open intervals are permitted.
- `GROUP` and `PRIVATE` are API types. Internal Duo is `PRIVATE` with capacity 2,
  not a third public format. Public ratios/capacity still need owner acceptance.
- Existing class time and capacity have no update endpoint. Staff can create,
  assign a trainer and cancel a class; changing time means a new class.
- Recurrence previews all occurrences. Commit recomputes conflicts and omits
  unavailable occurrences; the remaining set is atomic. A write-time overlap
  rolls that set back.
  Limit: 104 occurrences, weekdays Monday 0 through Sunday 6, duration 1–480
  minutes. There is no 26-week horizon policy; omission is server-owned.
- No waitlist is exposed by the current product. Legacy model/response fields
  do not authorize a waitlist UI.

Sources: `src_BE/app/api/bookings.py`, `services/scheduling.py`,
`services/recurrence.py`, `schemas/scheduling.py`, `domain/rules.py`.
Paths in this document are relative to the repository root.

## Booking, cancellation and credits

- `GET /my-schedule/bookable` returns eligible class IDs. Missing IDs are not
  trustworthy negative answers when a response reaches its limit of 300.
- The server selects a valid package, normally the one expiring first. Booking
  deducts one credit in the same transaction. The UI does not subtract balances
  or promise a particular package before server acceptance.
- The cancellation deadline is start minus 4 hours for Group, minus 1 hour for
  Private. The current server includes the exact deadline (`now <= deadline`).
  After it, student cancellation/rescheduling is refused.
- Render `can_cancel`, `refund_if_cancelled_now` and `cancel_deadline` from
  `/my-schedule`; changing a booking is an atomic cancel-and-book transaction.
- Studio class cancellation refunds held `BOOKED` records atomically. A class
  with recorded attendance cannot be cancelled through this operation.
- Ledger entries carry reason and actor. Adjustments require a reason; the
  backend rejects a negative closing balance. Attendance does not deduct again.
- Renewal queues use the backend threshold: <=6 credits OR <=15 days remaining.

Sources: `src_BE/app/domain/rules.py`, `services/booking_service.py`,
`services/credit_ledger.py`, `services/scheduling.py`, `api/my_schedule.py`.

## Packages and payments

- Sold packages freeze catalogue snapshots; later catalogue edits do not rewrite
  previously sold packages. Balances and validity remain server-owned.
- Receipts belong to a student package, use CASH or TRANSFER, and start PENDING.
  CONFIRMED receipts contribute to revenue. This application does not take
  online payments.
- VOID retains its audit row and reason. The server refuses voiding consumed
  credits, packages with other live receipts or credits from other sources.
  Where permitted, voiding also reverses package credits atomically.
- Money responses are decimal strings. The payment UI accepts nonnegative whole
  VND with valid separators; it never removes a minus sign to make a valid amount.
- State is always stated in text as well as tone; uncertain writes are not
  automatically retried.

Sources: `src_BE/app/services/payments.py`, `services/package_sales.py`,
`services/credit_ledger.py`, `models/money.py`.

## Authentication and private media

- Login uses email. Reset/new passwords require at least 10 characters.
  Forgot-password confirmation does not reveal whether an email exists.
- Account creation normally omits a password and sends an activation invitation;
  the API also permits an initial password. The staff UI uses invitations.
- Logout revokes all server sessions. Local credentials/cache are discarded
  immediately even if the server is unreachable; offline server revocation
  cannot be promised.
- Progress photos: ADMIN, the assigned trainer and the student themselves can
  read/upload; deletion is ADMIN only. STAFF cannot access these bytes.
  Private files require authenticated API access and no-store responses.
- Photo consent/retention, studio contacts and commercial facts still require
  owner decisions. Technical access controls do not settle these decisions.

Sources: `src_BE/app/api/auth.py`, `api/accounts.py`, `api/progress_photos.py`,
`core/permissions.py`; FE `app/lib/api/endpoints/auth.ts`.
