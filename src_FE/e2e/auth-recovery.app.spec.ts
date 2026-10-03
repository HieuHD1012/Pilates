import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
for (const width of [390, 1440]) {
  test.describe(`Recovery ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    test("recovery copy, invalid password and successful reset", async ({ page }) => {
      await page.goto("/quen-mat-khau");
      await page
        .getByRole("button", { name: "Gửi hướng dẫn đặt lại", exact: true })
        .click();
      await expect(page.getByText("Nhập đúng địa chỉ email")).toBeVisible();
      await page.getByLabel("Email").fill("admin@demo.local");
      await page
        .getByRole("button", { name: "Gửi hướng dẫn đặt lại", exact: true })
        .click();
      await expect(page.getByText(/Nếu thông tin bạn nhập khớp/)).toBeVisible();
      await page.screenshot({
        path: `visual-qa/admin-states/recovery-sent-${width}.png`,
        fullPage: true,
      });
      await page.goto("/dat-lai-mat-khau?token=demo-token-for-visual-review");
      await expect(page.getByText("Ít nhất 10 ký tự.", { exact: true })).toBeVisible();
      const pw = page.getByLabel(/^Mật khẩu mới/);
      const again = page.getByLabel(/^Nhập lại mật khẩu mới/);
      await pw.fill("123456789");
      await again.fill("123456789");
      await page.getByRole("button", { name: "Lưu mật khẩu mới", exact: true }).click();
      await expect(page.getByText("Mật khẩu cần ít nhất 10 ký tự")).toBeVisible();
      await pw.fill("new-password-2026");
      await again.fill("different-password");
      await page.getByRole("button", { name: "Lưu mật khẩu mới", exact: true }).click();
      await expect(page.getByText("Hai lần nhập chưa giống nhau")).toBeVisible();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          document
            .getAnimations()
            .filter((a) => a.effect?.getTiming().iterations !== Infinity)
            .map((a) => a.finished.catch(() => {})),
        );
      });
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(axe.violations).toEqual([]);
      await page.screenshot({
        path: `visual-qa/admin-states/recovery-reset-errors-${width}.png`,
        fullPage: true,
      });
      await again.fill("new-password-2026");
      await page.getByRole("button", { name: "Lưu mật khẩu mới", exact: true }).click();
      await expect(page.getByText(/Đã lưu mật khẩu/).first()).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Đăng nhập", exact: true }),
      ).toBeVisible();
    });
  });
}
