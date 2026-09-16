# Architecture

## Stack

|                                           | Version                | Note                                                      |
| ----------------------------------------- | ---------------------- | --------------------------------------------------------- |
| React                                     | 19                     |                                                           |
| React Router                              | 8 — **framework mode** | Not declarative mode, not data mode                       |
| Vite                                      | 8                      | Native `resolve.tsconfigPaths`                            |
| TypeScript                                | **6.0** strict         | Not 7.0 — see `docs/adr/0003`                             |
| Tailwind CSS                              | 4                      | CSS-first config; the token layer is `app/styles/app.css` |
| TanStack Query                            | 5                      | The only server-state cache                               |
| React Hook Form + Zod                     | 7 / 4                  |                                                           |
| Radix UI                                  | —                      | Headless infrastructure only                              |
| Vitest + Testing Library, Playwright, MSW |                        |                                                           |

## Rendering model

```
                  build time                          runtime
  ┌────────────────────────────────┐        ┌────────────────────────────┐
  │ react-router build             │        │ Browser                    │
  │  • loaders run for the routes  │        │  • SPA fallback for        │
  │    in prerender-paths.ts       │  ───▶  │    /hv /hlv /studio        │
  │  • emits [route]/index.html    │        │  • TanStack Query owns     │
  │  • emits __spa-fallback.html   │        │    all mutable state       │
  └────────────────────────────────┘        └────────────────────────────┘
              │                                          │
              ▼                                          ▼
        CDN / Nginx / object storage            Authoritative backend API
```

`ssr: false`. There is no production Node runtime. `build/server` is produced,
used during the build to pre-render, and **not deployed**.

## Layers

```
routes/      thin: compose features and primitives, own URL and meta
layouts/     one per audience; role gating lives here, not in every route
features/    domain logic: queries, mutations, copy maps, domain components
lib/         API adapter, query keys, query client, formatting, cn
ui/          design-system primitives — no domain knowledge
content/     studio facts, nav, photography briefs, prerender paths
mocks/       MSW; never imported by application code
```

A route module should read like a table of contents. If it grows domain logic,
that logic belongs in `features/`.

## Layout boundaries

`PublicLayout` · `AuthLayout` · `StudentLayout` · `TrainerLayout` · `StaffLayout`.
Each owns its chrome and its `RoleGate`. They deliberately do not share a shell:
a studio manager's rail and a student's tab bar are different products of the
same design system.

## Error handling

`root.tsx` exports an `ErrorBoundary` for document-level failures and a
`HydrateFallback` for the SPA boot. Route-level failures are rendered inline by
`ErrorState` so the rest of the screen survives.

## Testing

| Level     | Tool                               | Covers                                                            |
| --------- | ---------------------------------- | ----------------------------------------------------------------- |
| Unit      | Vitest                             | Formatting, business-rule copy mapping, pure helpers              |
| Component | Vitest + Testing Library + MSW     | Remote states, mutation flows, a11y basics                        |
| E2E       | Playwright against `build/client`  | The real artifact set, deep links, SPA fallback, pre-rendered SEO |
| Contract  | `scripts/check-build-contract.mjs` | The deployment invariants                                         |
