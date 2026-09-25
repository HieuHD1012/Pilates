#!/usr/bin/env node
/**
 * Verifies the deployment contract after `npm run build`.
 *
 * These are the invariants that silently break a static React Router SPA and
 * are invisible until someone deep-links in production, so they are checked by
 * a machine rather than remembered by a person. See docs/DEPLOYMENT.md.
 */
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import { publicPrerenderPaths } from "../app/content/prerender-paths.ts";

const CLIENT = "build/client";
const failures = [];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function htmlPathFor(route) {
  return route === "/"
    ? join(CLIENT, "index.html")
    : join(CLIENT, route.slice(1), "index.html");
}

// 1. Every declared public route must exist as a real HTML document.
for (const route of publicPrerenderPaths) {
  const file = htmlPathFor(route);
  if (!(await exists(file))) {
    failures.push(`Missing pre-rendered document for "${route}" (expected ${file})`);
  }
}

// 2. Because "/" IS pre-rendered, the SPA fallback lives at __spa-fallback.html.
//    If this file disappears, every /hv, /hlv and /studio deep link 404s on the
//    CDN while the app still works in dev — the worst possible failure mode.
const fallback = join(CLIENT, "__spa-fallback.html");
if (!(await exists(fallback))) {
  failures.push(
    `Missing ${fallback}. The hosting rewrite depends on it; see docs/DEPLOYMENT.md.`,
  );
}

// 3. The rendering mode must still be ssr:false. React Router does emit a
//    build/server bundle — it uses it at BUILD time to pre-render — but that
//    bundle is not deployed: only build/client ships. What must never change is
//    the flag, because flipping it introduces a production Node runtime the
//    hosting topology does not have (docs/adr/0001).
const config = await readFile("react-router.config.ts", "utf8").catch(() => "");
if (!/\bssr:\s*false\b/.test(config)) {
  failures.push(
    "react-router.config.ts no longer declares ssr:false — the static deployment topology is broken (docs/adr/0001).",
  );
}
if (!(await exists(join(CLIENT, "index.html")))) {
  failures.push(
    "build/client/index.html is missing — the deployable artifact set is incomplete.",
  );
}

// 4. Critical SEO content must be IN the pre-rendered HTML, not injected later.
const home = await readFile(htmlPathFor("/"), "utf8").catch(() => "");
for (const [label, needle] of [
  ["<title>", "<title>"],
  ['meta name="description"', 'name="description"'],
  ["h1 copy", "Lớp nhóm nhỏ và lớp riêng tại Nha Trang."],
  ["lang attribute", 'lang="vi"'],
]) {
  if (!home.includes(needle)) {
    failures.push(`Home document is missing ${label} in pre-rendered HTML.`);
  }
}

// 5. Mock Service Worker must never be wired into a production bundle.
const assets = await readFile(htmlPathFor("/"), "utf8").catch(() => "");
if (assets.includes("mockServiceWorker")) {
  failures.push(
    "Production HTML references mockServiceWorker — fixtures leaked into the build.",
  );
}

if (failures.length > 0) {
  console.error("\nBuild contract FAILED:\n");
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  console.error("");
  process.exit(1);
}

console.log(
  `Build contract OK — ${publicPrerenderPaths.length} pre-rendered routes, SPA fallback present, ssr:false intact.`,
);
