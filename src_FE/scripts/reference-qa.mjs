/** Visual variant smoke sweep: rendered images, horizontal bounds and key paths. */
/* global document */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:5190";
const routes = ["/", "/dich-vu", "/gioi-thieu", "/dat-tu-van"];
const viewports = [1440, 1024, 768, 390];
const browser = await chromium.launch();
const failures = [];

for (const width of viewports) {
  const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
  for (const route of routes) {
    await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    for (const image of await page.locator('img[loading="lazy"]').all()) {
      await image.scrollIntoViewIfNeeded();
    }
    await page.waitForLoadState("networkidle");
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > globalThis.innerWidth + 1,
      broken: [...document.images]
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc),
      h1Count: document.querySelectorAll("h1").length,
    }));
    if (state.overflow || state.broken.length || state.h1Count !== 1) {
      failures.push({ width, route, state });
    }
  }
  if (width === 390) {
    await page.goto(base, { waitUntil: "networkidle" });
    const menuButton = page.getByRole("button", { name: "Mở menu" });
    await menuButton.click();
    assert.equal(await page.locator("#os-menu").isVisible(), true);
    await page.locator("#os-menu").getByRole("link", { name: /Hình thức tập/ }).click();
    await page.waitForURL("**/dich-vu");
    await page.locator("#os-menu").waitFor({ state: "detached" });
    assert.equal(new URL(page.url()).pathname, "/dich-vu");
    assert.equal(await page.locator("#os-menu").count(), 0);

    await page.goto(`${base}/dat-tu-van`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Gửi thông tin" }).click();
    assert.equal(await page.getByText("Vui lòng nhập họ tên").isVisible(), true);
  }
  await page.close();
}

await browser.close();
assert.deepEqual(failures, [], JSON.stringify(failures, null, 2));
console.log(`PASS ${routes.length * viewports.length} route/viewport combinations; images, bounds, headings, mobile menu and consultation validation.`);
