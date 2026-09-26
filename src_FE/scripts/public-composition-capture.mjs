/* global document */
/** Full-page visual review of every public route. */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:5202";
const output = process.argv[3] ?? "../docs/ui-audit/screenshots/composition-after";
const routes = [
  ["home", "/"],
  ["about", "/gioi-thieu"],
  ["services", "/dich-vu"],
  ["packages", "/goi-tap"],
  ["trainers", "/huan-luyen-vien"],
  ["schedule", "/lich-tap"],
  ["promotions", "/khuyen-mai"],
  ["contact", "/lien-he"],
  ["consultation", "/dat-tu-van"],
];
const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
];

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const measurements = [];

for (const view of viewports) {
  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: 1,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
  });
  const page = await context.newPage();

  for (const [name, path] of routes) {
    console.log(`${view.name}px ${name}`);
    await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
    if (name === "home") {
      await page.getByText(/Dữ liệu mẫu dùng cho phát triển/).waitFor();
    }
    await page.locator("main img").evaluateAll(async (images) => {
      await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
    });
    const measured = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));
    measurements.push({ route: name, viewport: view.width, ...measured });
    // Capturing a tall viewport avoids Chromium omitting AVIF images that begin
    // below the original viewport during a full-page capture.
    await page.setViewportSize({ width: view.width, height: measured.height });
    await page.screenshot({ path: `${output}/${name}-${view.name}.png` });
    await page.setViewportSize({ width: view.width, height: view.height });
  }
  await context.close();
}

await browser.close();
await writeFile(`${output}/measurements.json`, JSON.stringify(measurements, null, 2));
