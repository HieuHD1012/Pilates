# Open questions

Ten of the fifteen confirmation questions in the workbook are unanswered, and
the Nha Trang branch has supplied no studio facts. Nothing here has been
invented; each item names how the code behaves until it is answered.

## Business rules

| #   | Question                                                                                                       | Current handling                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q5  | Can students self-serve booking/cancel/reschedule, and can staff and trainers act for them?                    | Treated as **yes** — the function list explicitly assigns "Đăng ký thay học viên" to studio, staff and trainers. Recorded here because the answer cell is blank.                                                                                                                                                                                                                                       |
| Q7  | On a freed seat, auto-promote the first person on the waitlist, or wait for staff confirmation?                | `Booking.waitlistAutoPromote: boolean \| null`. `null` → neutral copy, no promise. **Discrepancy:** the function list also describes staff "chuyển người chờ" manually, which points at manual promotion. Do not resolve this in code.                                                                                                                                                                 |
| Q8  | Deduct the session at booking and refund on an on-time cancellation?                                           | Assumed yes ("trừ buổi an toàn" in the function list). `eligibility.sessionCost` and `booking.sessionsCharged` come from the backend, so a different answer needs no redesign.                                                                                                                                                                                                                         |
| Q9  | Cash/transfer recorded by staff only, no online payment?                                                       | Assumed yes. Staff record a receipt with an amount, a method and a status; nothing takes money online. A receipt carries no package reference, because Q-commercial (packages and prices) is unanswered.                                                                                                                                                                                               |
| Q10 | Is a reminder to staff enough at 6 sessions / 15 days, with no automatic message?                              | Assumed yes. `renewalDue` surfaces as a note; nothing is sent.                                                                                                                                                                                                                                                                                                                                         |
| Q11 | Zalo/WhatsApp buttons only, no automated messaging?                                                            | Assumed yes. Contact links only.                                                                                                                                                                                                                                                                                                                                                                       |
| Q14 | Are the basic reports sufficient for phase one?                                                                | Reporting is phase 7 and unbuilt.                                                                                                                                                                                                                                                                                                                                                                      |
| Q18 | Does the studio need a real `.xlsx`, or is a CSV that Excel opens enough?                                      | **Assumed enough.** The trainer report exports CSV with a UTF-8 BOM and semicolon delimiters, so Excel reads Vietnamese correctly and splits the columns. A true `.xlsx` means adding a library for one report; say the word and it is a small change.                                                                                                                                                 |
| Q17 | When the studio cancels a class, what happens to the sessions already charged to the students who were booked? | **Unanswered, and it matters.** Q8 covers a student cancelling on time; a studio cancellation is a different case, and charging students for a class the studio called off is indefensible. Nothing is refunded in the mock because no per-booking record exists there to refund — the backend owns this. The cancel dialog states the number of students affected and that the studio must tell them. |
| Q16 | May a manual adjustment take a session balance below zero, and if so what happens?                             | **Unanswered.** The form shows the resulting balance before saving and says plainly that a negative one has no rule behind it; nothing blocks it, because inventing a floor would be inventing a business rule. Needs a decision before launch.                                                                                                                                                        |
| Q15 | Store student progress photos, and who may view them?                                                          | **Blocking.** Not implemented. Personal photographs need a confirmed retention and access rule before any code is written.                                                                                                                                                                                                                                                                             |

## Gaps found when wiring the real API (18/09/2026)

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

## Studio facts (all null in `app/content/studio.ts`)

Address · map link · phone · Zalo · WhatsApp · Instagram · email · opening hours.

Rendered by `<PendingFact>` as "Đang cập nhật". **The Đà Nẵng studio's address,
phone and opening hours must not be copied across.**

## Commercial

- Package names, session counts, durations and prices for Nha Trang. `/goi-tap`
  explains how packages work and routes to a conversation; it prints no prices.
- Class capacity per type. Copy says "lớp nhóm nhỏ" and never a number.
- Class duration. Only present in dev fixtures, never in public copy.

## Brand assets

- Logo files and confirmed trainer profiles. Three photographs from the supplied
  `docs/thiet-ke/anh-studio/` set are now composed into the preview; the source
  folder calls this set **J Pilates**, while this product is **Soul Pilates Nha
  Trang**. The owner must confirm that Soul may represent these pictures as its
  own room and sessions before release. See `docs/photo-composition-from-zero.md`.
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

- The staff calendar has no create/edit class action (Phase 6) and its sidebar
  has two entries. The earlier attempt is materially more complete here.
- The demo fixtures seed a group capacity of `4`. Nha Trang has confirmed no
  capacity, so this number is arbitrary and must not reach public copy —
  see the class-capacity item above.
- Neither the grid nor the ruler collapses unused midday hours; roughly half the
  visible grid can be empty for a studio that teaches mornings and evenings.
