# Query conventions

## The API adapter

`app/lib/api/client.ts` is the only place this application calls the network.

- `api.get` / `post` / `patch` / `delete`, all typed.
- Failures throw `ApiError` with `status`, `code`, `fieldErrors`, and helpers
  `isAuth`, `isForbidden`, `isValidation`, `isConflict`, `isServer`.
- `401` dispatches one `soul:unauthorized` event. A single listener in `root.tsx`
  handles the redirect, and only for `/hv`, `/hlv`, `/studio` paths — a stale
  session must never eject a visitor reading the public site.
- Raw backend text is never shown to a student. Staff surfaces may pass
  `ApiError.message` into `ErrorState`'s `detail` prop for triage.

Do not add axios, do not add a second client, do not call `fetch` directly.

## Query keys

Every key is created in `app/lib/api/query-keys.ts`. Inline array literals are
not allowed, because invalidation then becomes a guess.

```ts
queryKeys.student.classes({ from, to, type });
queryKeys.staff.calendar(filters);
```

Invalidate by prefix when a mutation touches a family:

```ts
queryClient.invalidateQueries({ queryKey: ["student", "bookings"] });
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

## Purity

Do not read the clock during render. `Date.now()` in a component body is
rejected by `react-hooks/purity`. Anchor time-dependent filtering to
`query.dataUpdatedAt`, which is stable between renders and changes when the data
does — see `app/routes/student/classes.tsx`.
