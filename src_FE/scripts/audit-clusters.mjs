/* global document, window, innerWidth */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

// A route-wide inspection, not a claim that axe measures comprehension.
const base = process.argv[2] ?? "http://localhost:5199";
const out = process.argv[3] ?? "visual-qa/clusters";
const routes = [
  ["/", null], ...["gioi-thieu", "dich-vu", "goi-tap", "huan-luyen-vien", "lich-tap", "khuyen-mai", "lien-he", "dat-tu-van", "dang-nhap", "quen-mat-khau", "dat-lai-mat-khau"].map(p => [`/${p}`, null]),
  ...["lop-hoc", "lop-hoc/1", "lich-cua-toi", "lich-su", "goi-tap", "tai-khoan"].map(p => [`/hv/${p}`, "STUDENT"]),
  ...["hom-nay", "lich-day", "lop/1", "ho-so"].map(p => [`/hlv/${p}`, "TRAINER"]),
  ...["tong-quan", "lich", "lich/1", "khach-quan-tam", "khach-quan-tam/1", "hoc-vien", "hoc-vien/1", "huan-luyen-vien", "huan-luyen-vien/1", "goi-tap", "thanh-toan", "so-buoi", "gia-han", "bao-cao", "bao-cao/doanh-thu", "bao-cao/lop-hoc", "bao-cao/huan-luyen-vien", "tai-khoan"].map(p => [`/studio/${p}`, "ADMIN"]),
  ["/khong-ton-tai", null],
];
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const report = [];
for (const width of (process.argv[4] ?? "1440,390").split(",").map(Number)) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh" });
  const page = await context.newPage();
  for (const [route, role] of routes) {
    await page.goto(base);
    await page.evaluate(role => role ? localStorage.setItem("soul:demo-role", role) : localStorage.removeItem("soul:demo-role"), role);
    await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
      await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(250);
    const slug = route === "/" ? "home" : route.slice(1).replaceAll("/", "_");
    await page.screenshot({ path: `${out}/${slug}-${width}.png`, fullPage: true });
    const geometry = await page.evaluate(() => ({
      title: document.querySelector("h1")?.textContent,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      // Long unbreakable content and fixed flex actions are common culprits.
      clipped: [...document.querySelectorAll("main p, main dd, main button, main a")].filter(e => e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 2).map(e => e.textContent?.trim().slice(0, 90)),
    }));
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    report.push({ route, role, width, ...geometry, violations: axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) });
    console.log(`${width} ${route}: ${axe.violations.length} axe, overflow=${geometry.overflow}`);
  }
  await context.close();
}
await browser.close();
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
