# ADR 0002 — TanStack Query is the only server-state cache

**Status:** Accepted · 2026-08-18

## Context

Under `ssr: false`, React Router offers `clientLoader` for route-level data. It
is a real option and it overlaps with TanStack Query. Choosing both means two
caches for the same entity, two invalidation stories, and screens that disagree
with each other.

This product is operational: capacity, rosters, balances and payments change
while people are looking at them. Cache correctness is a business concern, not a
performance detail.

## Decision

Mutable backend state is owned exclusively by TanStack Query.

- Route `loader`s serve build-time public content only.
- `clientLoader` is not used for any domain a query owns.
- No client global store (Zustand, Redux) holds backend entities — enforced by
  `no-restricted-imports`.
- `useEffect` + `fetch` is not a data strategy — enforced by
  `no-restricted-syntax`.
- All query keys are declared in `app/lib/api/query-keys.ts`.

## Consequences

- One invalidation model. A mutation lists what it touched; see `useBookClass`.
- Background refetching, focus refetching and stale-while-revalidate come free
  and are configured once.
- 4xx responses are never retried: "class full" is an answer, not a failure.
- Route transitions do not block on data; each screen renders its own four
  states.

## Rejected

- **`clientLoader` everywhere** — would require rebuilding caching, dedup,
  background refresh and invalidation by hand.
- **Both, split by route** — the split would not survive contact with a feature
  that needs the same entity in two places.
