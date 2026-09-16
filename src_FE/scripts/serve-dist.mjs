#!/usr/bin/env node
/**
 * Serves build/client the way the CDN is contracted to serve it, so e2e tests
 * exercise the real deployment topology:
 *   - a pre-rendered document wins when one exists;
 *   - anything else falls back to __spa-fallback.html, NOT index.html.
 * Development only. Production is Nginx/CDN — see docs/DEPLOYMENT.md.
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const ROOT = "build/client";
const PORT = Number(process.argv[2] ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

async function resolve(pathname) {
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const candidates = [
    join(ROOT, safe),
    join(ROOT, safe, "index.html"),
    join(ROOT, `${safe}.html`),
  ];
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      /* try next */
    }
  }
  return join(ROOT, "__spa-fallback.html");
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  const file = await resolve(decodeURIComponent(pathname));
  res.writeHead(200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": file.endsWith(".html") ? "no-cache" : "public, max-age=31536000",
  });
  createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(
    `Serving ${ROOT} on http://localhost:${PORT} (SPA fallback: __spa-fallback.html)`,
  );
});
