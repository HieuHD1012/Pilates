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
- **At most one `/auth/refresh` is in flight.** The backend rotates the refresh
  token with a ten-second grace window and treats a spent token presented after
  it as theft — it revokes every session that person has. So 401s queue behind
  one shared promise. Never call refresh from a component.
- `401` dispatches one `soul:unauthorized` event. A single listener in `root.tsx`
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
