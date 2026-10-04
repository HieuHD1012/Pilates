# Deployment contract

Reconciled on 2026-10-04. This is a host configuration contract and local test
harness, not evidence that a production host has already been configured.

## Artifact and routing

`react-router build` emits `build/client`, the entire static deployable artifact.
Do not deploy `build/server`; it is used only for selective prerendering.
The public homepage is `index.html`; private deep links must fall back to
`__spa-fallback.html`, not to the marketing homepage.

- Serve public prerendered documents first, then the SPA fallback for route URLs.
- Missing assets must return 404, not an HTML fallback with status 200.
- `/api` and `/api/*` must reach the backend or return an explicit API failure;
  never serve SPA HTML there. Same-origin deployments must strip `/api` because
  this backend mounts `/auth`, `/students`, etc. without that prefix.
- Hash-addressed `/assets/*` can be immutable for one year. Stable public images
  and `mockServiceWorker.js` are not hash-addressed assets.
- HTML is `no-cache`. Private API bytes use their backend no-store policy.

Example same-origin Nginx routing; configure real TLS, upstream and security
policy on the target host before release:

```nginx
server {
  root /srv/j-pilates/build/client;

  location = /api { return 404; }
  location ^~ /api/ {
    proxy_pass http://127.0.0.1:8000/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  location ^~ /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    add_header X-Content-Type-Options nosniff always;
    try_files $uri =404;
  }
  location ~* \.(?:js|css|woff2?|png|jpe?g|webp|avif|svg|ico)$ {
    add_header Cache-Control "public, max-age=3600" always;
    add_header X-Content-Type-Options nosniff always;
    try_files $uri =404;
  }
  location / {
    add_header Cache-Control no-cache always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    try_files $uri $uri/index.html /__spa-fallback.html;
  }
}
```

`serve-dist.mjs` tests static routing locally; `/api/*` returns JSON 503 because
that local host has no proxy. It also rejects decoded path escapes and missing
file paths. The actual CDN/proxy must be smoke-tested separately.

## Build environment and gates

`VITE_API_BASE_URL` is baked into the artifact. Empty means same-origin `/api`;
an explicit origin calls that origin directly. Production HTTPS must not call
an HTTP API. Backend CORS must allow the exact FE origin; do not use fixture
success to infer correct CORS.

`VITE_ENABLE_MSW` is development-only. The dynamic import has a direct
`import.meta.env.DEV` guard, build removes the copied worker, and the build
contract scans lazy JavaScript as well as HTML for mock/fixture leakage.

```bash
npm ci
npm run verify          # typecheck, lint, tests, build, contract, bundle, content code
npm run e2e -- --project=desktop --project=mobile --project=app
npm run check:release   # required studio facts must have owner and due date
```

The local gzip budgets are largest JS <=80KiB, all JS <=400KiB, homepage external
script/preload references <=200KiB. These prevent build regressions; they are
not field Web Vitals, a complete initial network graph or an image budget.

## Fixture versus real-API testing

- `desktop`/`mobile`: built artifact, prerender/SEO/axe/deep links/static routing.
- `app`: development MSW, UI transitions and write/error states; never production
  permission, database reconciliation or concurrency proof.
- `live`: built artifact against an explicitly provisioned disposable API/database.
  `RUN_LIVE_API=true` is required. Never enable it against customer records.

Repository CI installs Node 24, runs FE verify/regressions and provisions a
separate PostgreSQL/API job for `production-api.live.spec.ts`. Its student flow
checks booking/cancellation ledger effects and a forbidden report request.
Until that job actually runs, it remains an unexecuted integration harness.
Local custom ports use PLAYWRIGHT_PORT and PLAYWRIGHT_DEV_PORT; LIVE_API_URL must
match the built VITE_API_BASE_URL. Seed account credentials are disposable only.

## Release evidence still required

Verify HTTPS, CORS, private file no-store, noindex, missing asset/API behavior and
cache headers on the intended host. Evaluate CSP against the real artifact;
React Router emits inline hydration scripts, so a blanket script-src policy can
break it. Record tested hashes/policy, frame restrictions and permitted media/API
origins rather than claiming a generic header is automatically compatible.

Test last-seat races, cancellation boundaries, uncertain writes, export safety
and every sensitive photo role/object combination against controlled real data.
Record redacted errors with release/context identifiers, monitoring ownership
and the owner's acceptance of daily workflows and provisional content.

Deploy complete versioned artifacts atomically. Retain the previous release and
its referenced hashed assets; test rollback with compatible FE/BE contracts.
A new local build, CI configuration or green fixture suite is not deployment or
production approval.
