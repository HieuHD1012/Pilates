import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * These run against `build/client` served the way the CDN serves it
 * (scripts/serve-dist.mjs), so they exercise the real deployment topology
 * rather than the dev server.
 */

test.describe("public site", () => {
  test("the homepage ships its SEO content as HTML, not as hydration", async ({ page }) => {
    // JavaScript is deliberately not required: this asserts the pre-rendered
    // document, which is what a crawler receives.
    const response = await page.goto("/");
    const html = (await response?.text()) ?? "";

    expect(html).toContain('lang="vi"');
    expect(html).toContain("<title>");
    expect(html).toContain('name="description"');
    expect(html).toContain("Tập đúng hơn");
  });

  test("navigation reaches every page it advertises", async ({ page }) => {
    await page.goto("/");

    // Below `lg` the primary nav lives inside the menu sheet, so open it first.
    const menuButton = page.getByRole("button", { name: "Mở menu" });
    const nav = (await menuButton.isVisible())
      ? (await menuButton.click(),
        page.getByRole("navigation", { name: "Điều hướng chính (di động)" }))
      : page.getByRole("navigation", { name: "Điều hướng chính" });

    const links = nav.getByRole("link");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      const href = await links.nth(index).getAttribute("href");
      expect(href).toBeTruthy();
      const response = await page.request.get(href!);
      expect(response.status(), `${href} must not 404`).toBe(200);
    }
  });

  test("the consultation form validates before it submits", async ({ page }) => {
    await page.goto("/dat-tu-van");

    await page.getByRole("button", { name: "Gửi thông tin" }).click();
    await expect(page.getByText("Vui lòng nhập họ tên")).toBeVisible();

    await page.getByLabel(/Họ và tên/).fill("Nguyễn Thị Demo");
    await page.getByLabel(/Số điện thoại/).fill("123");
    await page.getByRole("button", { name: "Gửi thông tin" }).click();
    await expect(page.getByText("Số điện thoại chưa đúng định dạng")).toBeVisible();
  });

  const PUBLIC_ROUTES = [
    "/",
    "/gioi-thieu",
    "/dich-vu",
    "/goi-tap",
    "/huan-luyen-vien",
    "/lich-tap",
    "/lien-he",
    "/dat-tu-van",
  ];

  for (const route of PUBLIC_ROUTES) {
    test(`${route} has no serious accessibility violations`, async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const serious = results.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .flatMap((v) => v.nodes.map((n) => `${v.id} @ ${n.target.join(" ")}`));
      expect(serious).toEqual([]);
    });
  }

  test("does not scroll horizontally at any QA breakpoint", async ({ page }) => {
    for (const width of [375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const overflows = await page.evaluate(
        () =>
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflows, `horizontal overflow at ${width}px`).toBe(false);
    }
  });
});
