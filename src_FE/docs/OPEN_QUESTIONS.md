# Open questions

Reconciled on 2026-10-04. Historical unanswered workbook cells do not imply
that the current API has no policy. Backend source resolves the implemented
behavior below; studio facts and release acceptance remain separate decisions.

## Business decisions and current contracts

| Item                    | Current implementation                                                                                           | Remaining decision/evidence                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Q5 Booking authority    | STUDENT self-service only; no booking-on-behalf endpoint                                                         | Owner acceptance of this scope                                       |
| Q7 Waitlist             | Excluded from the current product; legacy fields are not active scope                                            | A future feature requires an explicit backend/product decision       |
| Q8 Deduction/refund     | Deduct 1 on booking, refund on timely cancellation, atomic change                                                | Staging cutoff/concurrency cases                                     |
| Q9 Commerce             | Cash/transfer receipts linked to packages, confirmed-only revenue, guarded VOID                                  | Owner reconciliation workflow and launch catalogue                   |
| Q10 Renewals            | Backend flags <=6 credits OR <=15 days; contact outcomes are recorded                                            | Messaging/workflow acceptance                                        |
| Q11 Messaging           | Contact links, no automatic messages                                                                             | Actual Zalo/contact details                                          |
| Q14 Reports             | Summary/revenue/classes/trainers screens and endpoints implemented                                               | Studio acceptance and real-data/export verification                  |
| Q18 Spreadsheet         | Backend CSV and XLSX export options exist; no FE spreadsheet library needed                                      | Verify required export scope, encoding and formula safety on staging |
| Q17 Studio cancellation | Refunds held bookings; refuses classes with recorded attendance                                                  | Real-API ledger reconciliation                                       |
| Q16 Negative balance    | Backend rejects a negative closing balance                                                                       | No FE negative-balance override                                      |
| Q15 Progress photos     | Protected endpoints and authorized FE view exist; ADMIN/assigned TRAINER/self access, STAFF denied, ADMIN delete | Consent, retention and production permission tests                   |
| Cancellation window     | GROUP 4h, PRIVATE 1h, exact deadline included by current server                                                  | Owner confirmation that public copy and deployed API agree           |

## Current API constraints

The frontend now calls the backend's own 88 endpoints (`docs/API_MAPPING.md`).
Five things a screen wanted turned out to have no endpoint behind them. None is
a bug; each is a decision that has not been made, and each is listed with what
the screen does instead.

| What a screen wanted                                    | Why it cannot have it                                                                             | What it does instead                                                                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The cancellation deadline **before** booking            | `cancel_deadline` is computed per booking, so it exists only once the booking does.               | The class page says the deadline appears in "Lịch của tôi" after booking. It does **not** restate the 4h/1h policy — that would be a second copy of a backend rule. |
| A trainer seeing how many people are in their own class | `GET /bookings` is ADMIN/STAFF. `GET /classes/my-schedule` carries capacity, not occupancy.       | The trainer's week shows seats offered. The class itself shows the attendance roster, which is the real answer.                                                     |
| Fill rate per trainer                                   | `GET /reports/trainers` returns sessions and attendances, not capacity — there is no denominator. | The column is gone. The class-size breakdown on the class report answers the same question from a query that has the numbers.                                       |
| Distinct students taught by a trainer                   | No endpoint counts them.                                                                          | Absent rather than approximated.                                                                                                                                    |
| Class report by type and by day                         | `GET /reports/classes` is one set of totals for the period.                                       | The per-trainer class-size table replaces both breakdowns.                                                                                                          |

One more, worth a decision rather than a workaround: the studio's people are
identified by **phone**, but `POST /auth/login` authenticates by **email**. Every
sign-in screen now asks for an email. If the studio expects staff to sign in with
a phone number, that is a backend change, not a frontend one.

### What the first run against the real backend added (18/09/2026)

Signing in as each role and working the screens against a live API turned up
four defects the fixture run could not, all now fixed. Two are worth carrying
forward as backend-side notes:

- **`weekdays` has no documented convention.** `POST /classes/recurrence` reads
  the array with Python's `date.weekday()` — Monday 0 … Sunday 6 — but the
  generated page says only `integer[]`, and the note block is empty. The
  frontend had guessed ISO-8601 (Monday 1 … Sunday 7), so every recurring class
  landed a day late and a Sunday pattern was refused outright. The convention
  lives in `src_BE/app/schemas/scheduling.py` as a comment; it should be in the
  endpoint's note block, where a client author reads.
- **`scripts/seed_admin.py` does not validate the email it writes.** Seeding
  `admin@soulpilates.local` succeeds, that account signs in, and then
  `GET /accounts` answers `500` for every ADMIN — `AccountResponse` re-validates
  the address and `email-validator` rejects the special-use domain. Whatever
  writes a user should hold to the same rule as whatever reads one.

## Studio facts

Address, map link, phone and Zalo are still required. Email, WhatsApp and
Instagram are optional. Opening hours are provisional owner-authorized copy;
see the dated table below.

Rendered by `<PendingFact>` as "Đang cập nhật". **The Đà Nẵng studio's address,
phone and opening hours must not be copied across.**

## Commercial

- Package names, session counts, durations and prices for Nha Trang. `/goi-tap`
  explains how packages work and routes to a conversation; it prints no prices.
- Class capacity per type. Copy says "lớp nhóm nhỏ" and never a number.
- Class duration. Only present in dev fixtures, never in public copy.

## Brand assets

- Logo files, real photography (six active slots; briefs in `app/content/photography.ts`),
  and confirmed trainer profiles.
- **Q12/Q13:** whether the studio supplies brand assets and seeds initial data by
  Excel — both unanswered.

Run `npm run check:content` for the live inventory.

## Known gaps in this build (found by blind design review, 2026-08-18)

A six-lens blind comparison against an earlier attempt at this product, with
each verdict adversarially challenged, produced these confirmed findings. Fixed
items are listed so they are not "re-discovered"; open items are work.

**Fixed**

- Display leading was `0.94` at ~100px, leaving no clearance between a
  dot-below (`ộ ạ ệ`) and a stacked tone mark (`ề ấ ổ`) on the next line. Now
  `1.04` / `1.10` / `1.22` for `d1` / `d2` / `d3`.
- The staff calendar truncated the trainer to `HLV D…` on every chip and class
  names to `Reformer C…`, which is three-way ambiguous in the fixture data.
  Chips now carry the full time range, an untruncated trainer line, a `title`
  with everything, and the grid is 68rem wide instead of 52rem.
- The homepage claimed the timetable was "cập nhật trực tiếp từ hệ thống của
  studio" — a live-sync guarantee for a backend that does not exist. Removed.
- The homepage week strip auto-wrapped on a phone instead of being designed for
  it. It now has an explicit sub-`sm` layout.
- Fixture-backed screens now render `<DemoDataNotice>` in development, so a
  screenshot cannot be mistaken for the real studio.

**Open**

- Historical calendar-create gap is closed. Class time/capacity editing is
  excluded by the current API, not an unfinished frontend action.
- The demo fixtures seed a group capacity of `4`. Nha Trang has confirmed no
  capacity, so this number is arbitrary and must not reach public copy —
  see the class-capacity item above.
- Neither the grid nor the ruler collapses unused midday hours; roughly half the
  visible grid can be empty for a studio that teaches mornings and evenings.

## Provisional policies modelled on Soul Pilates Đà Nẵng (03/10/2026)

The owner asked for the public site to follow Soul Đà Nẵng's published policies
until the Nha Trang studio confirms its own ("sai gì chủ sửa sau"). These are
**owner-authorised placeholders, not confirmed facts**. Location facts were not
copied: another city's address, phone or map link is a wrong door, not a policy.

| Claim on the public site                       | Source                                                                           | Where it lives                                  | Confirm before launch                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| Group classes: at most 3 students (1:3)        | Soul homepage, "Group Class 1:3"                                                 | `CLASS_FORMATS[group].ratio/size`               | Real capacity per class is still set by staff; must match.      |
| Private classes: 1 student, 1 trainer (1:1)    | Soul homepage                                                                    | `CLASS_FORMATS[private]`                        | Backend allows capacity 2 (internal Duo) — decide.              |
| 55-minute sessions                             | Soul timetable                                                                   | `SESSION_MINUTES`; schedule rows use real times | Copy only; rows always show the class's real duration.          |
| Opening hours Mon–Sat 07:30–19:30              | Soul footer                                                                      | `STUDIO.openingHours`                           | Nha Trang hours.                                                |
| Private cancellation window 1 hour (was 8)     | **Not Soul** — matches what the backend enforces; Soul publishes both 12h and 3h | `CANCELLATION_POLICY.private`                   | Owner picks one window per format; backend and copy must agree. |
| Demo catalogue 5/10/20/30 packs at Soul prices | Soul /packages                                                                   | `app/mocks/fixtures.ts` (DEMO, dev only)        | Real packages and prices are entered by staff.                  |

## Staff capabilities without API support

The approved staff redesign (ADR 0006) drew a few things no endpoint provides.
They are **not built**; each needs a backend answer first.

| Canvas element                               | Needs                                                                                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Global search in a top bar (students, leads) | One endpoint that searches names and phones across both.                                                                                     |
| Notification bell                            | A notification model. None exists.                                                                                                           |
| Calendar booked/capacity counts              | Implemented through held bookings; at the 500-booking cap, FE reads authoritative class detail counts. Week payload itself has no occupancy. |
| "Nhắn Zalo" on a lead                        | Whether the studio uses a Zalo OA or a personal number.                                                                                      |
