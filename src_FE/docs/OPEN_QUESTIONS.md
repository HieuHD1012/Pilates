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

- **The name on the pictures is not the name on the site. Blocking.** Every
  surface in this repository says _Soul Pilates Nha Trang_. The 21 frames the
  studio sent on 28.08.2026 say _J Pilates — Align & Alive, tầng 4, 35 Hồng
  Bàng_. This is not a watermark that can be cropped out: the mark is printed on
  the reformers and mounted on the wall, so it is in the room itself and in
  every frame of it. Until someone confirms which name the studio trades under,
  the two filled photo slots put one brand's room on another brand's site.
  Nothing in this repository can settle it.
- Photography: two of the five briefs in `app/content/photography.ts` are filled
  from that delivery — `room` and `practice`. `hero`, `method` and `city` have no
  frame in it that answers them, and each records what was missing. They need a
  shoot, not another review of the same 21 pictures.
- Logo files and confirmed trainer profiles. `studio-16.jpg` in the delivery is a
  clean logo lockup and `studio-18.jpg` carries an address, opening hours and a
  WhatsApp number — all under the J Pilates name, so all held by the question
  above.
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
