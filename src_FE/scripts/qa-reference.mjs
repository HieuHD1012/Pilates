/** Branch-local public journey check for the Pvolve reference experiment. */
/* global document */
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:5192";
const routes = ["/", "/dich-vu", "/lich-tap", "/dat-tu-van"];
const widths = [1440, 1024, 768, 390];
const browser = await chromium.launch();
const failures = [];

for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const route of routes) {
    await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    for (const image of await page.locator('img[loading="lazy"]').all()) {
      await image.scrollIntoViewIfNeeded();
    }
    const result = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      broken: [...document.images]
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc),
      placeholders: document.querySelectorAll("[data-photo-placeholder]").length,
    }));
    if (result.overflow > 1 || result.broken.length > 0) {
      failures.push({ width, route, ...result });
    }
    console.log(`${width} ${route}: overflow=${result.overflow}, broken=${result.broken.length}, pending-image-slots=${result.placeholders}`);
  }

  if (width === 390) {
    await page.goto(base, { waitUntil: "networkidle" });
    const menu = page.getByRole("button", { name: "Mở menu" });
    await menu.click();
    if ((await page.getByRole("button", { name: "Đóng menu" }).getAttribute("aria-expanded")) !== "true") {
      failures.push({ width, route: "mobile menu", reason: "menu did not open" });
    }
    await page.getByRole("navigation", { name: "Điều hướng chính (di động)" }).getByRole("link", { name: /Hình thức tập/ }).click();
    await page.waitForURL(`${base}/dich-vu`);
    if (!page.url().endsWith("/dich-vu") || (await page.getByRole("button", { name: "Mở menu" }).getAttribute("aria-expanded")) !== "false") {
      failures.push({ width, route: "mobile menu", reason: "navigation or close failed" });
    }
  }

  await page.goto(`${base}/dat-tu-van`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Gửi thông tin" }).click();
  const invalid = await page.locator('[aria-invalid="true"]').count();
  if (invalid < 2) failures.push({ width, route: "consultation", reason: `expected required field validation, got ${invalid}` });
  await page.close();
}

await browser.close();
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
