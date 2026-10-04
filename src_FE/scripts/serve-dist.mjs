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
import { extname, join, normalize, resolve as resolvePath, relative } from "node:path";

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
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

async function resolve(pathname) {
  const safe = normalize(`.${pathname}`);
  const withinRoot = relative(resolvePath(ROOT), resolvePath(ROOT, safe));
  if (withinRoot.startsWith("..") || pathname.includes("\\") || pathname.includes("\0"))
    return null;
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
  // Missing assets must never return an HTML document with a JavaScript MIME
  // mismatch. Only extensionless route requests receive the SPA fallback.
  return extname(pathname) ? null : join(ROOT, "__spa-fallback.html");
}

createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  } catch {
    res.writeHead(400);
    res.end("Invalid URL");
    return;
  }
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    res.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(
      JSON.stringify({
        detail: {
          code: "API_NOT_CONFIGURED",
          message: "API is not configured on the local artifact server",
        },
      }),
    );
    return;
  }
  let file;
  try {
    file = await resolve(pathname);
  } catch {
    res.writeHead(400);
    res.end("Invalid URL");
    return;
  }
  if (!file) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.writeHead(200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": file.endsWith(".html")
      ? "no-cache"
      : pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600",
  });
  createReadStream(file)
    .on("error", () => res.destroy())
    .pipe(res);
}).listen(PORT, () => {
  console.log(
    `Serving ${ROOT} on http://localhost:${PORT} (SPA fallback: __spa-fallback.html)`,
  );
});
