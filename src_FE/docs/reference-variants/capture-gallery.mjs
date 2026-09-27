import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });

try {
  await page.goto(pathToFileURL(join(here, "gallery.html")).href);
  await page.waitForFunction(() =>
    [...document.images].length === 24 &&
    [...document.images].every((image) => image.complete && image.naturalWidth > 0),
  );
  for (const number of [1, 2]) {
    const path = join(here, `overview-${number}.png`);
    await page.locator(`#board-${number}`).screenshot({ path });
    console.log(path);
  }
} finally {
  await browser.close();
}
