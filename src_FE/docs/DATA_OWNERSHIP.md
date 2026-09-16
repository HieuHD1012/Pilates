# Data ownership

One invariant, and most bugs in a product like this come from breaking it.

```
React Router loader   →  public, stable, pre-renderable SEO content
TanStack Query        →  mutable runtime backend state
React useState        →  ephemeral UI state
The backend           →  authoritative business state
```

## Loaders

A route `loader` runs **at build time only**, and only for routes listed in
`app/content/prerender-paths.ts`. React Router permits it there and nowhere else
under `ssr: false`.

Use one for content that is true at build time and worth having in the HTML for
search engines. Do not use one for anything a staff member can change during the
day.

## TanStack Query

Everything the studio operates on: schedules, classes, capacity, bookings,
waitlists, packages, session balances, payments, leads, trainers, reports, and
the session itself.

There is exactly one cache. Do not add a second one, do not mirror server
entities into a store, and do not use `clientLoader` for a mutable domain that a
query already owns — two owners means two truths and a stale screen.

## A page can use both

`/lich-tap` is the canonical example. The document — heading, explanation, links,
meta tags — is pre-rendered and indexable. The timetable inside it is fetched at
runtime by `usePublicSchedule`. No timetable row is ever baked into the build.

Same pattern on `/huan-luyen-vien`: the page is pre-rendered, the roster is a
query, and no trainer's name is hard-coded anywhere.

## The backend decides

The frontend never computes:

- whether a student may book (`eligibility.canBook`, `eligibility.reasons`);
- what a booking costs (`eligibility.sessionCost`);
- whether a cancellation refunds a session (`cancellation.refundable`,
  `cancellation.deadlineAt`, `cancellation.policyHours`);
- waitlist order or whether a freed seat auto-promotes
  (`waitlistPosition`, `waitlistAutoPromote`);
- the session balance — it is the sum of the ledger, returned as
  `sessionsRemaining`;
- authorization.

`RoleGate` and hidden buttons are **UX**. They keep people out of screens that
would confuse them. They are not a security boundary, and a code review that
treats them as one is wrong.

## Mutations

Transactions against a balance are never optimistic. Booking a class deducts a
session; showing the deduction before the backend agrees means showing a seat
that may not exist. The button waits.

Optimistic updates are acceptable for reversible, non-transactional preferences
(a toggle, a filter) and nowhere else in this product.
