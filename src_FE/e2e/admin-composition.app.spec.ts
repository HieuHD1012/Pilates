import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
async function openAs(page: Page, path: string, role = "ADMIN") {
  await page.goto("/");
  await page.evaluate((role) => localStorage.setItem("soul:demo-role", role), role);
  await page.goto(path);
  await page.getByRole("heading", { level: 1 }).waitFor();
}
async function inspect(page: Page, name: string, width: number) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    );
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
  ).toBe(true);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.failureSummary),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: `visual-qa/admin-states/${name}-${width}.png`,
    fullPage: true,
  });
}
for (const width of [390, 1440]) {
  test.describe(`Admin composition ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    test("sign-in validation, password reveal and role destination", async ({ page }) => {
      await openAs(page, "/dang-nhap", "STUDENT");
      await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
      await expect(page.getByText("Nhập đúng địa chỉ email")).toBeVisible();
      await page.getByLabel("Email", { exact: false }).fill("admin@demo.local");
      const password = page.locator("input[autocomplete=current-password]");
      await password.fill("test-password");
      await page.getByRole("button", { name: "Hiện mật khẩu", exact: true }).click();
      await expect(password).toHaveAttribute("type", "text");
      await page.getByRole("button", { name: "Ẩn mật khẩu", exact: true }).click();
      await expect(password).toHaveAttribute("type", "password");
      await inspect(page, "login-filled", width);
      await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
      await expect(page).toHaveURL(/studio\/tong-quan/);
    });
    test("long student identity and email remain readable after create", async ({
      page,
    }) => {
      await openAs(page, "/studio/hoc-vien");
      await page.getByRole("button", { name: "Tạo học viên", exact: true }).click();
      const d = page.getByRole("dialog");
      const name = "Nguyễn Thị Hoàng Phương Anh — Hồ sơ kiểm tra tên dài";
      await d.getByLabel("Họ và tên").fill(name);
      await d.getByLabel("Số điện thoại").fill("0912345678");
      await d
        .getByLabel("Email")
        .fill("hoangphuonganh.tenemailratdai.dekiemtrakhongcatnoidung@example.com");
      await inspect(page, "student-create", width);
      await d.getByRole("button", { name: "Tạo hồ sơ", exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await inspect(page, "student-long-content", width);
      await page.getByRole("tab", { name: "Gói & thanh toán", exact: true }).click();
      await inspect(page, "student-commerce", width);
      await page.getByRole("tab", { name: "Lịch sử lớp", exact: true }).click();
      await inspect(page, "student-history", width);
      await page.getByRole("tab", { name: "Ảnh tiến trình", exact: true }).click();
      await inspect(page, "student-photos", width);
      await page.getByRole("link", { name: "Danh sách học viên", exact: true }).click();
      await page.getByLabel("Tìm học viên").fill(name);
      await expect(page.getByRole("link", { name, exact: false }).first()).toBeVisible();
      await inspect(page, "student-long-list", width);
    });
    test("enquiry edits and conversion preserve the record", async ({ page }) => {
      await openAs(page, "/studio/khach-quan-tam/1");
      await page.getByLabel("Trạng thái sau khi liên hệ").selectOption("CONTACTED");
      await page
        .getByLabel("Ghi chú")
        .fill("Đã tư vấn lớp nhóm. Khách hẹn tới studio vào tuần sau.");
      await page.getByRole("button", { name: "Lưu kết quả", exact: true }).click();
      await expect(page.getByText("Đã lưu.", { exact: true })).toBeVisible();
      await inspect(page, "lead-saved", width);
      await page
        .getByRole("button", { name: "Chuyển thành học viên", exact: true })
        .click();
      await inspect(page, "lead-convert", width);
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Tạo hồ sơ học viên", exact: true })
        .click();
      await expect(page).toHaveURL(/studio\/hoc-vien\/\d+/);
    });
    test("renewal action opens one focused form and appends a contact", async ({
      page,
    }) => {
      await openAs(page, "/studio/gia-han");
      await expect(page.getByLabel("Kết quả", { exact: true })).toHaveCount(0);
      await page
        .getByRole("button", { name: "Ghi nhận liên hệ", exact: true })
        .first()
        .click();
      const d = page.getByRole("dialog");
      await d
        .getByLabel("Kết quả", { exact: true })
        .fill("Đã gọi, học viên muốn gia hạn vào tuần sau.");
      await d.getByLabel("Hẹn lại").fill("2026-10-10");
      await inspect(page, "renewal-contact", width);
      await d.getByRole("button", { name: "Đã liên hệ", exact: true }).click();
      await expect(d).toBeHidden();
      await expect(
        page.getByText("Đã gọi, học viên muốn gia hạn vào tuần sau.", { exact: false }),
      ).toBeVisible();
    });
    test("ledger selection identifies the package and validates an adjustment", async ({
      page,
    }) => {
      await openAs(page, "/studio/so-buoi");
      await page.getByLabel("Học viên", { exact: true }).selectOption("1");
      await page.getByRole("link", { name: /DEMO Gói 10 buổi nhóm.*Mở sổ/ }).click();
      await expect(page).toHaveURL(/so-buoi\?goi=1&hv=1/);
      await inspect(page, "ledger-selected", width);
      await page.getByRole("button", { name: "Điều chỉnh buổi", exact: true }).click();
      const d = page.getByRole("dialog");
      await d
        .getByRole("button", { name: /Ghi|Điều chỉnh/, exact: false })
        .last()
        .click();
      await expect(d.getByText("Nhập số buổi", { exact: true })).toBeVisible();
      await inspect(page, "ledger-adjustment", width);
    });
    test("account overflow names the person and lock dialog states consequences", async ({
      page,
    }) => {
      await openAs(page, "/studio/tai-khoan");
      await page
        .getByRole("button", { name: /Thao tác tài khoản/ })
        .first()
        .click();
      await page.getByRole("button", { name: /Khóa tài khoản của/ }).click();
      const d = page.getByRole("dialog");
      await expect(d).toContainText("thu hồi");
      await inspect(page, "account-lock", width);
      await d.getByRole("button", { name: "Đóng", exact: true }).click();
      await expect(d).toBeHidden();
    });
    test("staff role hides restricted accounts and private progress photos", async ({
      page,
    }) => {
      await openAs(page, "/studio/hoc-vien/1", "STAFF");
      await expect(
        page.getByRole("tab", { name: "Ảnh tiến trình", exact: true }),
      ).toHaveCount(0);
      if (width < 1024)
        await page.getByRole("button", { name: "Menu studio", exact: true }).click();
      await expect(
        page.getByRole("navigation").getByRole("link", { name: "Tài khoản", exact: true }),
      ).toHaveCount(0);
      await inspect(page, "staff-permissions", width);
    });
  });
}
