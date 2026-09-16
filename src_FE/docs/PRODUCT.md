# Product

Soul Pilates Nha Trang is a public website **and** the studio's operating system.
The public surface is small; most of the complexity is behind the login.

Functional source of truth:
`docs/source/Pilates_Danh_Sach_Chuc_Nang_Va_Cau_Hoi_Xac_Nhan.xlsx`
(9 function groups, 51 functions, plus 15 confirmation questions).

## Audiences

|               | Wants                                                  | Device           |
| ------------- | ------------------------------------------------------ | ---------------- |
| Visitor       | To judge whether this studio is worth a call           | Phone first      |
| Student       | Their balance, their schedule, the next bookable class | Phone            |
| Trainer       | What they teach next and who is in it                  | Phone            |
| Staff / owner | To run the studio without fighting software            | Desktop, all day |

## Function groups (from the workbook)

1. **Tài khoản người dùng** — login, password reset, account list, profile and access.
2. **Website và tiếp nhận khách quan tâm** — home, studio, services and packages,
   public trainers, public schedule, promotions, Zalo/WhatsApp contact,
   consultation form, lead list and detail.
3. **Quản lý học viên** — list, create/edit, overview, packages & payments, class
   history, progress photos, convert lead → student.
4. **Quản lý huấn luyện viên** — list, create/edit, detail, "my teaching schedule".
5. **Gói tập, số buổi và thanh toán** — package types, sell/assign, payments,
   session ledger, manual adjustment, renewal.
6. **Lớp và lịch học** — day/week calendar, create/edit, recurring classes, class
   detail and roster, trainer assignment, edit/cancel with conflict handling.
7. **Đăng ký, hủy, đổi và chờ lớp** — student class list, detail and booking,
   my schedule, cancel/reschedule, waitlist, staff waitlist management, booking
   on behalf of a student.
8. **Nhắc học viên sắp hết gói** — renewal summary, list, contact outcome.
9. **Báo cáo cơ bản** — management summary, revenue, classes & bookings,
   trainer report with Excel export.

## Confirmed scope

- Responsive web only for phase one. No native app. _(Q1)_
- **One studio / one location.** _(Q2)_
- Class types: **Group and Private only. No Duo.** _(Q3)_
- **Exactly one trainer per class.** _(Q4)_
- Refund window on cancellation: **4 hours for group, 8 hours for private.** _(Q6)_
- Renewal is flagged at **6 sessions or 15 days remaining.** _(function list)_
- Students may self-serve booking, cancel and reschedule; staff and trainers may
  act on a student's behalf. _(function list)_
- The session balance must equal the sum of the session ledger. _(function list)_
- Manual session adjustments require a reason and record the actor. _(function list)_
- Payments are recorded by staff as cash or bank transfer. No online payment.
- Public contact is a Zalo/WhatsApp link; the system does not send messages.

## Not confirmed

Ten of the fifteen confirmation questions are unanswered, including waitlist
auto-promotion and the deduction timing. See
[OPEN_QUESTIONS.md](OPEN_QUESTIONS.md). Nothing in this repository invents an
answer to them.

## Build order

| Phase | Content                                                             | State                         |
| ----- | ------------------------------------------------------------------- | ----------------------------- |
| 0     | Foundation: routing, rendering model, tooling, CI, API adapter, MSW | **done**                      |
| 1     | Creative discovery and Reference Lock                               | **done**                      |
| 2     | Token layer, primitives, three reference screens                    | **done**                      |
| 3     | Public experience — 9 routes pre-rendered                           | **done**                      |
| 4     | Auth and the four shells — incl. password reset and sign-out        | **done**                      |
| 5     | Scheduling core                                                     | **done**                      |
| 6     | Studio operations                                                   | **done**                      |
| 7     | Reporting                                                           | **done**                      |

### Where the function list stands

Every capability in §3–§9 has a screen, a query, the four remote states, and — as
of 2026-08-24 — its **write** half. Measured against the function list, the
product holds **28 of 28 write capabilities** that are not blocked on an
unanswered rule or on data the studio has not supplied:

- sign in / sign out · forgot + reset password
- submit a consultation request
- book a class · cancel a booking
- log a consultation outcome on a lead
- log a renewal contact
- lock / unlock an account
- create a student · edit a student · convert a lead into a student _(2026-08-22)_
- record a payment · confirm or void one · adjust a session balance with a reason
  _(2026-08-24)_
- create a class · edit one · reassign its trainer · cancel one with a reason —
  all four refuse a trainer double-booking and name the class they collided with
  _(2026-08-24)_
- **recurring class creation** — a weekly pattern, capped at 26 weeks; occurrences
  that clash are skipped and listed rather than silently dropped _(2026-08-24)_
- **book · cancel · reschedule on a student's behalf** — the same rules a student
  meets, with no staff override, because the studio has not said there is one
  _(2026-08-24)_
- **student-initiated reschedule and cancel** — both bounded by the studio's own
  cancellation window _(2026-08-24)_
- **create an account** — no password field, ever: the backend invites and the
  person sets their own _(2026-08-24)_
- **spreadsheet export on the trainer report** — CSV with a UTF-8 BOM and
  semicolons, which is what Excel needs to read Vietnamese and split columns
  _(2026-08-24)_

**Not blocked — all delivered.**

Nothing on the function list is now waiting on frontend work. What remains is
waiting on the studio:

**Blocked on an unanswered business rule** (docs/OPEN_QUESTIONS.md)

- join a waitlist, and staff promoting from it — Q7 has not been answered, and the
  function list contradicts itself on whether promotion is automatic or manual
- progress photos — Q15 needs a retention and access rule before any code

**Blocked on data the studio has not supplied**

- create / edit a package definition, sell or assign a package to a student, extend
  a package — all need confirmed packages and prices
- publish or hide a promotion — needs content

**Assumed, and worth confirming before launch**

- Q16 — may a manual adjustment take a session balance below zero?
- Q17 — when the studio cancels a class, what happens to the sessions already
  charged to the students who were booked?
- Q18 — is a real `.xlsx` required, or does a CSV that Excel opens suffice?

### Parity note

Compared against the earlier attempt in `../soul`, the route surface is complete —
41 of 41 of its routes have a counterpart here — and the data layer is materially
ahead: that build used a real query layer on 2 routes and used **zero** mutations.
So "parity with the reference build" is met. Product completeness is a different
line, and the twenty items above are the distance to it.
