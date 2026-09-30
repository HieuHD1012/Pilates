/** Capture updated desktop and phone home views for one reference branch. */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const prefix = process.argv[2] ?? "home-first";
const out = join(app, "docs/reference-variant-captures");
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5188", "--strictPort"], {
  cwd: app, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
});
let log = "";
server.stdout.on("data", (chunk) => { log += chunk; });
server.stderr.on("data", (chunk) => { log += chunk; });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(`Vite exited: ${log}`);
    try {
      const response = await fetch("http://127.0.0.1:5188/");
      if (response.ok) { ready = true; break; }
    } catch { /* wait for Vite */ }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (!ready) throw new Error(`Vite did not start: ${log}`);
  await mkdir(out, { recursive: true });
  browser = await chromium.launch();
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage({viewport: {width, height}, deviceScaleFactor: 1, locale: "vi-VN"});
    await page.goto("http://127.0.0.1:5188/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw new Error(`Horizontal overflow at ${width}px`);
    await page.screenshot({ path: join(out, `${prefix}-${width}.png`) });
    await page.screenshot({ path: join(out, `home-${width}.png`), fullPage: true });
    console.log(`${width}: first fold and full page captured`);
    await page.close();
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}
