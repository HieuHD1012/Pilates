import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto("https://soulpilates.com.vn/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  const data = await page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const variables = Object.fromEntries(
      [...rootStyle]
        .filter((name) => name.startsWith("--"))
        .map((name) => [name, rootStyle.getPropertyValue(name).trim()])
        .filter(([, value]) => value),
    );
    const styleOf = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        text: element.textContent?.trim().replace(/\s+/g, " ").slice(0, 90),
        color: style.color,
        background: style.backgroundColor,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        borderRadius: style.borderRadius,
      };
    };
    const samples = Object.fromEntries(
      ["body", "header", "nav", "main", "h1", "h1 em", "h2", "button", "a[href*='booking']", "footer"]
        .map((selector) => [selector, styleOf(selector)]),
    );
    const backgrounds = {};
    const foregrounds = {};
    for (const element of document.querySelectorAll("body *")) {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const area = element.getBoundingClientRect();
      if (area.width < 80 || area.height < 24) continue;
      const background = style.backgroundColor;
      const color = style.color;
      if (background !== "rgba(0, 0, 0, 0)") backgrounds[background] = (backgrounds[background] ?? 0) + 1;
      foregrounds[color] = (foregrounds[color] ?? 0) + 1;
    }
    return {
      title: document.title,
      stylesheets: [...document.styleSheets].map((sheet) => sheet.href).filter(Boolean),
      variables,
      samples,
      commonBackgrounds: Object.entries(backgrounds).sort((a, b) => b[1] - a[1]).slice(0, 25),
      commonForegrounds: Object.entries(foregrounds).sort((a, b) => b[1] - a[1]).slice(0, 25),
    };
  });
  writeFileSync(join(here, "soul-source-theme.json"), JSON.stringify(data, null, 2));
  await page.screenshot({ path: join(here, "soul-source-home.png"), fullPage: true });
  console.log(JSON.stringify({
    title: data.title,
    stylesheets: data.stylesheets,
    samples: data.samples,
    commonBackgrounds: data.commonBackgrounds,
    commonForegrounds: data.commonForegrounds,
    colorVariables: Object.fromEntries(Object.entries(data.variables).filter(([name]) => /color|background|accent|brand|primary|surface|text/.test(name)).slice(0, 100)),
  }, null, 2));
} finally {
  await browser.close();
}
