import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

// Build regression budgets, in gzip bytes. These are not field Web Vitals.
const root = "build/client";
const singleLimit = 80 * 1024;
const totalLimit = 400 * 1024;
const documentLimit = 200 * 1024;
const sizes = new Map();
for (const name of await readdir(join(root, "assets"))) {
  if (name.endsWith(".js"))
    sizes.set(
      `/assets/${name}`,
      gzipSync(await readFile(join(root, "assets", name))).length,
    );
}
const largest = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0];
const total = [...sizes.values()].reduce((sum, value) => sum + value, 0);
const html = await readFile(join(root, "index.html"), "utf8");
const referenced = new Set(
  [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+\.js)"[^>]*>/g)].map(
    (match) => match[1],
  ),
);
const documentBytes = [...referenced].reduce(
  (sum, path) => sum + (sizes.get(path) ?? 0),
  0,
);
console.log(
  `JS gzip: largest=${largest[1]} bytes (${largest[0]}), all chunks=${total} bytes, homepage external script/preload references=${documentBytes} bytes`,
);
if (largest[1] > singleLimit || total > totalLimit || documentBytes > documentLimit) {
  console.error(
    `Bundle budget exceeded: single <=${singleLimit}, total <=${totalLimit}, homepage references <=${documentLimit} bytes`,
  );
  process.exit(1);
}
