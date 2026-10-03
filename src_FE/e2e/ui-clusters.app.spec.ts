import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openAs(page: Page, path: string, role = "STUDENT") {
  await page.goto("/");
  await page.evaluate(role => localStorage.setItem("soul:demo-role", role), role);
  await page.goto(path);
  await page.getByRole("heading", { level: 1 }).waitFor();
}

async function usable(page: Page) {
  await page.evaluate(async () => {
    const finite = document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity);
    await Promise.all(finite.map(animation => animation.finished.catch(() => {})));
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => ({target: n.target, why: n.failureSummary})) }))).toEqual([]);
}

for (const width of [390, 1440]) {
  test.describe(`UI clusters ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("a selected package survives the move into the enquiry form", async ({ page }) => {
      await page.goto("/goi-tap");
      const card = page.getByRole("region", { name: "Gói lớp nhóm", exact: true });
      // HTML section has an accessible name and becomes a region.
      await expect(card.getByRole("heading", { name: "10 buổi", exact: true })).toBeVisible();
      const inquiry = card.getByRole("link", { name: /Tư vấn gói này\s*:\s*DEMO Gói 10 buổi nhóm/ });
      await inquiry.click();
      await expect(page).toHaveURL(/goi=.*10/);
      await expect(page.getByText("Bạn đang hỏi về: DEMO Gói 10 buổi nhóm")).toBeVisible();
      await page.getByRole("button", { name: "Gửi thông tin", exact: true }).click();
      await expect(page.getByText("Vui lòng nhập họ tên")).toBeVisible();
      await expect(page.getByText("Số điện thoại chưa đúng định dạng")).toBeVisible();
      await usable(page);
    });

    test("public schedule selection shows the next step beside the chosen class", async ({ page }) => {
      await page.goto("/lich-tap");
      const days = page.getByRole("group", { name: "Chọn ngày" });
      await days.getByRole("button").filter({ hasText: /./ }).first().waitFor();
      const withClasses = days.getByRole("button", { name: /\d+ buổi/ }).first();
      await withClasses.click();
      const option = page.locator("button[aria-pressed]").filter({ hasText: /Còn chỗ|Hết chỗ/ }).first();
      await option.click();
      await expect(option).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("link", { name: /Đăng nhập để đặt|Hỏi buổi khác/ }).first()).toBeVisible();
      await usable(page);
    });

    test("a student can discover a bookable class, confirm it and cancel it", async ({ page }) => {
      await openAs(page, "/hv/lop-hoc");
      const days = page.getByRole("group", { name: "Chọn ngày" }).getByRole("button");
      let bookable = page.locator("a[href^='/hv/lop-hoc/']").filter({ hasText: "Đặt được" }).first();
      for (let i = 0; i < await days.count(); i++) {
        if (await bookable.count()) break;
        await days.nth(i).click();
      }
      await expect(bookable).toBeVisible();
      await bookable.click();
      await page.getByRole("button", { name: "Đặt lớp này", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText("trừ");
      await usable(page);
      await dialog.getByRole("button", { name: "Xác nhận đặt", exact: true }).click();
      await expect(dialog).toBeHidden();
      await page.getByRole("link", { name: "Xem lịch của tôi", exact: true }).click();
      await page.getByRole("button", { name: "Hủy buổi", exact: true }).first().click();
      await expect(dialog).toContainText("hoàn");
      await usable(page);
      await dialog.getByRole("button", { name: "Hủy buổi", exact: true }).click();
      await expect(dialog).toBeHidden();
    });

    test("staff can reach every navigation group and open a long class form", async ({ page }) => {
      await openAs(page, "/studio/lich", "ADMIN");
      if (width < 1024) {
        await page.getByRole("button", { name: "Menu studio", exact: true }).click();
        const menu = page.getByRole("dialog");
        await expect(menu.getByRole("link", { name: "Thanh toán", exact: true })).toBeVisible();
        await expect(menu.getByRole("link", { name: "Tài khoản", exact: true })).toBeVisible();
        await usable(page);
        await menu.getByRole("button", { name: "Đóng", exact: true }).click();
      }
      await page.getByRole("button", { name: "Thêm lớp", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Thêm lớp", exact: true }).click();
      await expect(dialog.getByText("Chọn huấn luyện viên", { exact: true })).toBeVisible();
      await usable(page);
      await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
      await expect(dialog).toBeHidden();
    });

    test("student record tabs retain financial and class information on mobile", async ({ page }) => {
      await openAs(page, "/studio/hoc-vien/1", "ADMIN");
      await page.getByRole("tab", { name: "Gói & thanh toán", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Thanh toán", exact: true })).toBeVisible();
      await usable(page);
      await page.getByRole("tab", { name: "Lịch sử lớp", exact: true }).click();
      await expect(page.getByText("Studio đã hủy buổi")).toHaveCount(0);
      await usable(page);
    });
  });
}
