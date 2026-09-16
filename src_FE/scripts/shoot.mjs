/**
 * Visual QA capture. Renders the design at the breakpoints listed in
 * docs/RESPONSIVE.md so screens can be inspected as whole pages rather than
 * as a scroll position. Development tool; not part of CI.
 *
 *   node scripts/shoot.mjs <baseUrl> <outDir> [route ...]
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:5188";
const outDir = process.argv[3] ?? "shots";
// Routes may be written as "<path>" or "<path>@<demo-role>" to open a screen
// behind a role gate, e.g. "/studio/lich@staff".
const routes = process.argv.slice(4).length ? process.argv.slice(4) : ["/"];

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`  [console] ${msg.text().slice(0, 160)}`);
  });

  for (const entry of routes) {
    const [route, role] = entry.split("@");
    const url = `${base}${route}`;
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      (value) =>
        value
          ? localStorage.setItem("soul:demo-role", value)
          : localStorage.removeItem("soul:demo-role"),
      role ?? null,
    );
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const slug = route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "_");
    const file = `${outDir}/${slug}-${viewport.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  ${file}`);
  }
  await context.close();
}

await browser.close();
