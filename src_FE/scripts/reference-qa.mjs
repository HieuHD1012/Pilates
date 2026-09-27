/** 1Rebel branch: public viewport, image and journey sweep. */
/* global document */
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:5188";
const routes = ["/", "/dich-vu", "/lich-tap", "/dat-tu-van"];
const widths = [1440, 1024, 768, 390];
const browser = await chromium.launch();
const failures = [];

for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
  for (const route of routes) {
    await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    for (const image of await page.locator('img[loading="lazy"]').all()) {
      await image.scrollIntoViewIfNeeded();
    }
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > globalThis.innerWidth + 1,
      broken: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc),
      headings: document.querySelectorAll("h1").length,
    }));
    if (state.overflow || state.broken.length || state.headings !== 1) failures.push({ width, route, state });
  }
  if (width === 390) {
    await page.goto(base, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Mở menu" }).click();
    if (!(await page.getByRole("navigation", { name: "Điều hướng chính (di động)" }).isVisible())) failures.push({ width, route: "menu", reason: "did not open" });
    await page.getByRole("navigation", { name: "Điều hướng chính (di động)" }).getByRole("link", { name: /Hình thức tập/ }).click();
    await page.waitForURL("**/dich-vu");
    await page.getByRole("navigation", { name: "Điều hướng chính (di động)" }).waitFor({ state: "detached" });
    if (await page.getByRole("navigation", { name: "Điều hướng chính (di động)" }).count()) failures.push({ width, route: "menu", reason: "did not close" });
  }
  await page.close();
}

await browser.close();
console.log(`Checked ${routes.length * widths.length} route/viewport combinations; failures: ${failures.length}`);
if (failures.length) {
  console.error(failures);
  process.exitCode = 1;
}
