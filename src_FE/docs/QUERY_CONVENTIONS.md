# Query conventions

## Where the endpoints live

`app/lib/api/endpoints/` has one function per backend endpoint, grouped by
feature, and `docs/API_MAPPING.md` pairs each of them with the screen that calls
it. Features import from there; nothing else builds a URL.

## The API adapter

`app/lib/api/client.ts` is the only place this application calls the network.

- `api.get` / `post` / `patch` / `delete` / `blob`, all typed.
- Failures throw `ApiError` with `status`, `code`, `fieldErrors`, `rawMessage`
  and helpers `isAuth`, `isForbidden`, `isValidation`, `isConflict`,
  `isRateLimited`, `isRetryableConflict`, `isServer`.
- Every authenticated call carries `Authorization: Bearer <access_token>` from
  `app/lib/api/tokens.ts`.
- **One `/auth/refresh` per requesting session in a tab.** The backend rotates the refresh
  token with a ten-second grace window and treats a spent token presented after
  it as theft — it revokes every session that person has. So 401s queue behind
  one shared promise. Web Locks serialize tabs where available; storage is
  checked again before rotation. Other browsers rely on the server grace
  window. Never call refresh from a component.
- A definitive refresh-credential `401` ends the session; 429/5xx/offline
  preserves credentials and exposes retry. Anonymous 401 does not clear another
  account. A terminal authenticated `401` dispatches one `soul:unauthorized` event. A single listener in `root.tsx`
  handles the redirect, and only for `/hv`, `/hlv`, `/studio` paths — a stale
  session must never eject a visitor reading the public site.
- **Show the backend's `message`.** It is written in Vietnamese for the end user
  (`docs/api/README.md`), so `errorMessage(error, fallback)` renders it and the
  local copy tables only add the next step. `code` is for branching, never for
  reading aloud. A refusal with no body falls back to contextual copy.

Do not add axios, do not add a second client, do not call `fetch` directly.

## Query keys

Every key is created in `app/lib/api/query-keys.ts`. Inline array literals are
not allowed, because invalidation then becomes a guess.

Keys are named after the **backend resource**, not the screen: that is the unit
a mutation invalidates. One booking touches the student's schedule, the class it
was made against and the package it was charged to — three resources, whoever
happens to be looking at them.

```ts
queryKeys.classes.list(params);
queryKeys.mySchedule.list({ include_cancelled: true });
```

Invalidate a whole family with its root:

```ts
queryClient.invalidateQueries({ queryKey: roots.bookings });
```

## Defaults

Set once in `app/lib/query-client.ts`:

- `staleTime: 30s`, `gcTime: 5min`, `refetchOnWindowFocus: true` — a studio tab
  stays open all day;
- **4xx is never retried.** "Class full" and "no sessions remaining" are answers,
  not failures; retrying only delays the honest response;
- mutations never retry.

Per-query overrides: 15s for operational lists that move while people watch,
5min for near-static reference data such as the trainer roster.

## The four read states

Every remote surface designs all four. `SkeletonRows`, `EmptyState`,
`ErrorState` and `RefreshingRule` exist so this is cheap.

```tsx
{query.isPending ? <SkeletonRows rows={5} /> : null}
{query.isError ? <ErrorState description="…" onRetry={() => void query.refetch()} /> : null}
{query.isSuccess && data.length === 0 ? <EmptyState … /> : null}
{query.isSuccess && data.length > 0 ? <List … /> : null}
```

Use `placeholderData: (previous) => previous` on paginated or filtered lists so
existing rows stay on screen during a refetch, with `RefreshingRule` carrying
the fact that something is happening.

## Money and null

Money crosses the network as a decimal **string** (`"1500000.00"`) and is parsed
at the formatter — `formatVnd` takes either. Parsing at the network edge is how
a total picks up a floating-point tail.

`null` in a response means _not measured_, which is not zero. `fill_rate: null`
means no class ran; rendering "0%" would say classes were open and nobody came.
Leave the cell empty.

## Purity

Do not read the clock during render. `Date.now()` in a component body is
rejected by `react-hooks/purity`. Anchor time-dependent filtering to
`query.dataUpdatedAt`, which is stable between renders and changes when the data
does — see `app/routes/student/classes.tsx`.

## Identity boundaries and binary ownership

Requests capture a session version. A response from a previous account is
aborted before entering the cache. Sign-in/out and external storage changes
clear QueryClient and remount route observers; clearing a cache alone does not
replace mounted observer data. Same-tab credential rotation preserves identity.
Cross-tab token changes are handled conservatively as a boundary.

Private photo object URLs belong to QueryCache. Replacement, removal, expiry
and cache clear revoke them. Binary requests consume cancellation signals and
check them before creating a URL. Components do not retain a second URL cache.

## Mutation dependencies

`app/lib/api/invalidation.ts` is the shared resource dependency matrix.
Mutation `onSuccess` returns/awaits `invalidateChange(client, change)` so active
readers refresh before pending UI is released. Booking, class cancellation,
attendance and commerce affect reports, renewal queues and balances beyond the
screen that initiated them. Balance writes do not invalidate private photo files.

Raw booking arrays, joined rosters and calendar seat-count maps have distinct
registered keys. Never put different data shapes under the same key.

## Array-only list contracts

Students/leads/accounts/payments use server offsets and PageControls without an
invented total. Directory selectors collect offset pages until complete instead
of silently losing people after row 200. Counts derived from a page describe
that page, not the whole studio.

History uses selectable months and explicit +07:00 half-open boundaries because
`/my-schedule` has no offset. A 500-row month shows an incompleteness notice.
Bookable responses at the 300-ID cap fail explicitly; absent IDs cannot prove
ineligibility. Staff calendar occupancy falls back to class detail counts when
the weekly booking response reaches 500, with six concurrent requests maximum.
These safeguards do not create missing backend pagination capabilities.
