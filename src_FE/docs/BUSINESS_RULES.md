# Business rules

The backend owns every rule below. This document records what the studio has
confirmed so the UI can _explain_ the rules — never so the frontend can compute
them.

## Classes

- Two types: `group`, `private`. There is no Duo. _(Q3)_
- One trainer per class. Reassignment must not double-book a trainer. _(Q4)_
  Intervals are half-open: a class ending 07:20 and one starting 07:20 do not
  collide, because back-to-back is how a studio runs. A cancelled class holds no
  trainer and is never a conflict.
- Capacity may not be reduced below the number already booked. Not a studio rule —
  arithmetic: the alternative is evicting someone silently.
- A weekly pattern is checked one occurrence at a time. A clash skips that date
  and the studio is told which; it never refuses the whole pattern, and it never
  drops a date silently. Horizon capped at 26 weeks — a guard, not a studio rule.
- Rescheduling carries the session already charged: one buổi out, one buổi in. It
  is not a cancel-and-rebook and never costs a second buổi.
- Staff acting for a student meet the same rules the student does. There is no
  override, because the studio has not said there is one. _(Q5)_
- A student may move or cancel their own booking only inside the cancellation
  window; past it, staff can still act. Moving out of a buổi that would not be
  refunded is the same decision as cancelling it.
- Nobody sets another person's password. Creating an account sends an invitation.
- A cancelled class stays cancelled and carries its own `cancellationReason`,
  separate from the studio's note about the buổi. Re-running it is a new class.
  _(Assumed; see Q17.)_
- Capacity is set per class by the studio. **It is not a brand claim** — the Đà
  Nẵng studio's 1:3 is that studio's number and must not appear in Nha Trang copy.

## Packages and sessions

- A package has a session count, a start date and an expiry date.
- `sessionsRemaining` is authoritative and equals the sum of the session ledger.
  The frontend never derives a balance by subtraction.
- Every change is a signed ledger entry with a reason and an actor.
- Manual adjustments require a reason.
- Renewal is flagged at **6 sessions or 15 days** remaining; the backend returns
  `renewalDue`. The frontend does not recompute the threshold.

## Booking

- Eligibility is a backend decision returned as
  `{ canBook, canJoinWaitlist, reasons[], sessionCost }`.
- `app/features/booking/eligibility-copy.ts` maps each code to Vietnamese the
  student can act on. **Unknown codes must still produce a sentence** — a
  disabled button with no explanation is the worst outcome of a rule we did not
  model.
- A `409` from the booking endpoint is a business refusal, not an error. Render
  it with the same copy map.
- Bookings are never optimistic (see DATA_OWNERSHIP.md).

## Cancellation

- Confirmed policy: refund if cancelled **more than 4 hours** before a group
  class, **more than 8 hours** before a private class. _(Q6)_
- Those numbers live in `app/content/studio.ts` for public copy only. Every
  actual decision comes from `booking.cancellation`:
  `{ cancellable, refundable, deadlineAt, policyHours }`. If the studio changes
  the policy, no frontend release is required.

## Waitlist

- Order must be explicit and capacity must never be exceeded.
- **Unresolved:** whether a freed seat auto-promotes the first person or waits
  for staff confirmation _(Q7)_. Modelled as `waitlistAutoPromote: boolean | null`.
  When `null`, the UI stays neutral and promises nothing.

## Payments

- Recorded by staff: cash or bank transfer, with a status.
- Reports count confirmed transactions only.
- Payment state is never communicated by colour alone.
- A wrong record is **voided with a stated reason**, never edited into looking
  right, and never deleted — the row stays in the log carrying its reason. A
  confirmed record cannot be moved back to pending. _(Assumed; see Q9.)_

## Accounts

- Roles: `student`, `trainer`, `staff`, `owner`.
- Password reset links are single-use and expire.
- "Forgot password" returns the same confirmation whether or not the account
  exists — telling a visitor that a number is unregistered leaks the member list.
