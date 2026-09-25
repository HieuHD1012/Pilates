/** Repeatable visual audit against the running development app with MSW. */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:5188";
const out = process.argv[3] ?? "../docs/ui-audit/screenshots/integrated";
const views = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
];
const routes = [
  { name: "home", path: "/" },
  { name: "staff-dashboard", path: "/studio/tong-quan", role: "STAFF" },
  { name: "staff-calendar", path: "/studio/lich", role: "STAFF" },
  { name: "student-classes", path: "/hv/lop-hoc", role: "STUDENT" },
  { name: "student-schedule", path: "/hv/lich-cua-toi", role: "STUDENT" },
];

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const results = [];

for (const view of views) {
  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: 1,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
  });
  const page = await context.newPage();
  for (const route of routes) {
    console.log(`Capturing ${view.name}px ${route.name}`);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.evaluate((role) => {
      if (role) localStorage.setItem("soul:demo-role", role);
      else localStorage.removeItem("soul:demo-role");
    }, route.role ?? null);
    await page.goto(`${base}${route.path}`, { waitUntil: "networkidle" });
    if (route.name === "home") {
      await page.getByText(/Dữ liệu mẫu dùng cho phát triển/).waitFor();
      await page
        .locator("main img")
        .first()
        .evaluate((image) => image.decode());
    }
    await page.waitForTimeout(400);
    const metrics = await page.evaluate(() => ({
      viewport: globalThis.innerWidth,
      documentWidth: globalThis.document.documentElement.scrollWidth,
      documentHeight: globalThis.document.documentElement.scrollHeight,
      overflow: [...globalThis.document.querySelectorAll("body *")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.width > 0 && (rect.right > globalThis.innerWidth + 2 || rect.left < -2)
          );
        })
        .slice(0, 8)
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          className: String(element.className).slice(0, 90),
        })),
    }));
    results.push({ route: route.name, view: view.name, ...metrics });
    if (route.name === "home") {
      // Chromium can omit an AVIF below the initial viewport in a full-page shot.
      // Give the page its measured height so that the image is in the viewport.
      await page.setViewportSize({ width: view.width, height: metrics.documentHeight });
      await page.screenshot({ path: `${out}/${route.name}-${view.name}.png` });
      await page.setViewportSize({ width: view.width, height: view.height });
    } else {
      await page.screenshot({
        path: `${out}/${route.name}-${view.name}.png`,
        fullPage: true,
      });
    }

    if (view.width === 390 && route.name === "student-classes") {
      const tabs = page.getByRole("tab", { name: /T\d|CN/ });
      for (let i = 0; i < (await tabs.count()); i++) {
        await tabs.nth(i).click();
        if ((await page.getByRole("link", { name: /Đặt được/ }).count()) > 0) {
          await page.screenshot({
            path: `${out}/student-classes-populated-390.png`,
            fullPage: true,
          });
          break;
        }
      }
    }
    if (view.width === 390 && route.name === "staff-calendar") {
      await page.getByRole("button", { name: "Thêm lớp" }).click();
      await page.screenshot({ path: `${out}/staff-create-dialog-390.png` });
    }
    if (view.width === 390 && route.name === "home") {
      await page.getByRole("button", { name: "Mở menu" }).click();
      await page.screenshot({ path: `${out}/public-menu-390.png` });
    }
  }
  await context.close();
}

await browser.close();
await writeFile(`${out}/measurements.json`, JSON.stringify(results, null, 2));
console.log(
  JSON.stringify(
    results.filter((entry) => entry.documentWidth > entry.viewport + 2),
    null,
    2,
  ),
);
