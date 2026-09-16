# ADR 0001 — Static SPA with selective pre-rendering

**Status:** Accepted · 2026-08-18

## Context

Soul Pilates Nha Trang is a small public marketing surface attached to a much
larger authenticated studio-management application. The public surface needs to
be indexed. The application does not.

There is no requirement for a frontend server, and the studio's hosting is
static (CDN / Nginx / object storage). Introducing a Node runtime would add an
operational surface nobody has committed to running.

## Decision

React Router v8 **framework mode** with:

```ts
export default {
  ssr: false,
  prerender: [...publicPrerenderPaths],
} satisfies Config;
```

- Public routes are pre-rendered at build time into real HTML documents.
  Their route `loader`s run in Node during the build only.
- Every other route is served by the SPA fallback and owns its data with
  TanStack Query.
- The deployable artifact is `build/client` and nothing else.

## Consequences

- Public pages carry their SEO content in the HTML; verified by
  `scripts/check-build-contract.mjs`.
- No production Node runtime, no server to scale, patch or monitor.
- **Because `/` is pre-rendered, the SPA fallback is `__spa-fallback.html`, not
  `index.html`.** Hosting rewrites must target it. This is the single most
  likely deployment mistake and is therefore machine-checked.
- A route not in `prerender-paths.ts` may not export a `loader`.
- `build/server` is produced but never deployed.

## Rejected

- **Next.js / Astro** — both solve rendering problems this product does not have,
  and both would need a runtime or a second mental model for the 80% of the app
  that is authenticated.
- **Full SSR** — no benefit for authenticated screens, real cost in hosting.
- **Declarative or data mode** — loses typegen, the route module contract, and
  the official pre-render pipeline.
- **A custom prerender plugin** — the framework ships this.

## Revisit if

The public surface grows content that must be rendered per request (localised
pricing, personalised landing pages), or SEO measurement shows pre-rendering is
insufficient. Either would be a new ADR, not an edit to this one.
