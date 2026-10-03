/** Visual gate for a reference branch: four public routes at four widths. */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(app, "docs/reference-variant-captures");
const routes = [
  ["/", "home"],
  ["/gioi-thieu", "gioi-thieu"],
  ["/dich-vu", "dich-vu"],
  ["/dat-tu-van", "dat-tu-van"],
].filter(([, slug]) => !process.argv[2] || process.argv[2] === slug);
const viewports = [
  [1440, 900],
  [1024, 768],
  [768, 1024],
  [390, 844],
];
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5188",
    "--strictPort",
  ],
  {
    cwd: app,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);
let log = "";
server.stdout.on("data", (chunk) => {
  log += chunk;
});
server.stderr.on("data", (chunk) => {
  log += chunk;
});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error(`Vite exited: ${log}`);
    try {
      if ((await fetch("http://127.0.0.1:5188/")).ok) {
        ready = true;
        break;
      }
    } catch {
      /* waiting */
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (!ready) throw new Error(`Vite did not start: ${log}`);
  await mkdir(out, { recursive: true });
  browser = await chromium.launch();
  for (const [width, height] of viewports) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      locale: "vi-VN",
    });
    for (const [route, slug] of routes) {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:5188${route}`, { waitUntil: "networkidle" });
      await page.evaluate(() => globalThis.document.fonts.ready);
      const pageHeight = await page.evaluate(
        () => globalThis.document.documentElement.scrollHeight,
      );
      for (let y = 0; y < pageHeight; y += 700) {
        await page.evaluate((position) => globalThis.scrollTo(0, position), y);
        await page.waitForTimeout(40);
      }
      await page.evaluate(() => globalThis.scrollTo(0, 0));
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(
        () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
      );
      const broken = await page.evaluate(() =>
        [...globalThis.document.images]
          .filter((image) => image.complete && !image.naturalWidth)
          .map((image) => image.src),
      );
      if (overflow || broken.length)
        throw new Error(
          `${slug} ${width}: overflow=${overflow}, broken=${broken.join(",")}`,
        );
      await page.screenshot({ path: join(out, `${slug}-${width}.png`), fullPage: true });
      if (width === 1440 || width === 390)
        await page.screenshot({ path: join(out, `${slug}-first-${width}.png`) });
      if (width === 390) {
        const trigger = page.locator('button[aria-controls="menu-di-dong"]');
        await trigger.click();
        if (!(await page.locator("#menu-di-dong").isVisible()))
          throw new Error(`${slug}: mobile menu did not open`);
      }
      console.log(
        `${slug} ${width}: captured, no overflow/broken image${width === 390 ? ", menu opens" : ""}`,
      );
      await page.close();
    }
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}
