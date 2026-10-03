import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";

const out = join(dirname(fileURLToPath(import.meta.url)), "source-research");
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const sources = [
  ["ella", "https://ella-studio.de/"],
  ["pearl", "https://www.pearlpilatesnitra.sk/"],
].filter(([name]) => !process.argv[2] || process.argv[2] === name);
for (const [name, url] of sources) {
  const result = { name, url, viewports: {} };
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 900 : 844 }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(name === "pearl" ? 7000 : 1800);
    await page.evaluate(() => document.fonts.ready);
    if (name === "ella") await page.getByText("Verstanden", { exact: true }).first().click().catch(() => {});
    for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 700) {
      await page.evaluate((position) => scrollTo(0, position), y);
      await page.waitForTimeout(110);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(500);
    const data = await page.evaluate(() => {
      const css = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return { text: element.textContent?.trim().slice(0, 160), box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, color: style.color, background: style.backgroundColor, fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight };
      };
      return {
        title: document.title,
        pageHeight: document.documentElement.scrollHeight,
        body: css("body"), header: css("header"), h1: css("h1"), h2: css("h2"),
        button: css("a[href]:not(header a)"),
        images: [...document.images].slice(0, 16).map((image) => ({ alt: image.alt, width: image.naturalWidth, height: image.naturalHeight, box: image.getBoundingClientRect().toJSON() })),
      };
    });
    result.viewports[width] = data;
    await page.screenshot({ path: join(out, `${name}-${width}-first.png`) });
    await page.screenshot({ path: join(out, `${name}-${width}-full.png`), fullPage: true });
    console.log(`${name} ${width}: ${data.title}, ${data.pageHeight}px`);
    await page.close();
  }
  await writeFile(join(out, `${name}.json`), JSON.stringify(result, null, 2));
}
await browser.close();
