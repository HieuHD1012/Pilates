import type { Config } from "@react-router/dev/config";

import { publicPrerenderPaths } from "./app/content/prerender-paths";

/**
 * ARCHITECTURAL INVARIANT — do not change without an ADR (see docs/adr/).
 *
 * `ssr: false`  The production frontend is a static artifact set. There is no
 *               production Node runtime. See docs/DEPLOYMENT.md.
 *
 * `prerender`   Public/SEO routes are pre-rendered at build time. Their route
 *               `loader`s run in Node during the build only. Every other route
 *               is served through the SPA fallback and must own its data with
 *               TanStack Query (docs/DATA_OWNERSHIP.md).
 *
 * Because "/" IS pre-rendered, React Router emits the SPA fallback document at
 * `build/client/__spa-fallback.html` — NOT `index.html`. The hosting rewrite
 * MUST point at `__spa-fallback.html`. `npm run check:build-contract` enforces
 * this after every build.
 */
export default {
  ssr: false,
  prerender: [...publicPrerenderPaths],
} satisfies Config;
