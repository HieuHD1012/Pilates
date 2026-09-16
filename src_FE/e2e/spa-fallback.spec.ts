import { expect, test } from "@playwright/test";

/**
 * The deployment contract, exercised end to end.
 *
 * Because "/" is pre-rendered, React Router emits the SPA fallback at
 * __spa-fallback.html rather than index.html. A host that falls back to
 * index.html serves the marketing homepage for every application deep link —
 * and that mistake is invisible in development. These tests would catch it.
 */

test.describe("SPA fallback", () => {
  test("a deep link into the application boots the app, not the homepage", async ({
    page,
  }) => {
    await page.goto("/studio/lich");

    // Unauthenticated, so the app redirects to sign-in — which proves the
    // application shell booted rather than the public homepage being served.
    await expect(page).toHaveURL(/\/dang-nhap/);
    await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
  });

  test("a dynamic id survives a hard refresh", async ({ page }) => {
    await page.goto("/hv/lop-hoc/c-any-id-at-all");
    await expect(page).toHaveURL(/\/dang-nhap/);
    // The intended destination is preserved for after sign-in.
    await expect(page).toHaveURL(/next=/);
  });

  test("an unknown public path renders the 404 route", async ({ page }) => {
    await page.goto("/khong-ton-tai");
    await expect(
      page.getByRole("heading", { name: "Không tìm thấy trang này." }),
    ).toBeVisible();
  });

  test("the sign-in page does not leak into the search index", async ({ page }) => {
    await page.goto("/dang-nhap");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  });
});
