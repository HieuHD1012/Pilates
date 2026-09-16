# Deployment

## Topology

```
CI → react-router build → build/client/ → CDN / Nginx / object storage
```

`build/client` is the entire deployable artifact. **`build/server` is not
deployed** — it exists only so the build can pre-render.

## The one rewrite rule that matters

Because `/` is itself pre-rendered, React Router writes the SPA fallback to
`__spa-fallback.html`, **not** `index.html`. A host configured to fall back to
`index.html` will serve the marketing homepage for every `/studio/...` deep link
and the mistake will not appear in development.

`npm run check:build-contract` fails the build if the fallback goes missing.

### Nginx

```nginx
server {
  root /srv/soul-pilates/build/client;

  # Fingerprinted assets
  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }

  # Pre-rendered document, then directory index, then the SPA fallback
  location / {
    add_header Cache-Control "no-cache";
    try_files $uri $uri/index.html /__spa-fallback.html;
  }
}
```

Equivalent for other hosts: rewrite all unmatched paths to `/__spa-fallback.html`
with status 200.

`scripts/serve-dist.mjs` implements exactly this locally, and Playwright runs
against it, so the e2e suite exercises the real deployment behaviour.

## Caching

- `/assets/*` — immutable, one year (content-hashed).
- Fonts — immutable, one year (self-hosted, content-hashed by Vite).
- `*.html` — `no-cache`. Documents are small and must never pin a stale build.

## Environment

`VITE_API_BASE_URL` — backend origin; empty means same-origin `/api`.
`VITE_ENABLE_MSW` — development only. Fixtures are dynamically imported behind
`import.meta.env.DEV` and cannot reach a production bundle.

## Verify before release

```bash
npm run verify          # typecheck, lint, test, build, build contract
npm run e2e             # against the real artifact set
npm run check:content   # what the studio still owes us
```
