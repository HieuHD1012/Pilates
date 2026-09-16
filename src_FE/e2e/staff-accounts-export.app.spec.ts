import { expect, test, type Page } from "@playwright/test";

async function asStaff(page: Page, path: string) {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("soul:demo-role", "staff"));
  await page.goto(path);
}

test.describe("accounts", () => {
  test("creates an account without ever asking for a password", async ({ page }) => {
    await asStaff(page, "/studio/tai-khoan");
    await expect(page.getByRole("heading", { name: "Tài khoản" })).toBeVisible();

    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    const dialog = page.getByRole("dialog");

    // The studio does not choose anyone's password, so there is no field for one.
    await expect(dialog.locator('input[type="password"]')).toHaveCount(0);
    await expect(dialog).toContainText("tự đặt mật khẩu");

    await dialog.getByLabel(/Họ và tên/).fill("Vũ Minh Khang");
    await dialog.getByLabel(/Số điện thoại/).fill("0987 654 321");
    await dialog.getByLabel(/Quyền/).selectOption("trainer");
    await dialog.getByRole("button", { name: "Tạo tài khoản" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Vũ Minh Khang").first()).toBeVisible();
  });

  test("explains what each role can reach as the picker changes", async ({ page }) => {
    await asStaff(page, "/studio/tai-khoan");
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    const dialog = page.getByRole("dialog");

    await expect(dialog.getByText(/Xem lịch của mình/)).toBeVisible();
    await dialog.getByLabel(/Quyền/).selectOption("staff");
    await expect(dialog.getByText(/Toàn bộ phần vận hành studio/)).toBeVisible();
  });

  test("refuses a phone number that already has an account", async ({ page }) => {
    await asStaff(page, "/studio/tai-khoan");

    // Created by this test, so the duplicate is real rather than a fixture that
    // may not even be a mobile number.
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Họ và tên/).fill("Đinh Hải Yến");
    await dialog.getByLabel(/Số điện thoại/).fill("0961 234 567");
    await dialog.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Họ và tên/).fill("Trùng Số");
    await dialog.getByLabel(/Số điện thoại/).fill("0961234567");
    await dialog.getByRole("button", { name: "Tạo tài khoản" }).click();

    await expect(dialog.getByText("Số điện thoại này đã có tài khoản.")).toBeVisible();
    await expect(dialog).toBeVisible();
  });
});

test.describe("trainer report export", () => {
  test("downloads a CSV Excel can open", async ({ page }) => {
    await asStaff(page, "/studio/bao-cao/huan-luyen-vien");
    await expect(
      page.getByRole("heading", { name: "Báo cáo huấn luyện viên" }),
    ).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Xuất CSV" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^bao-cao-hlv-\d{4}-\d{2}-\d{2}-/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const text = Buffer.concat(chunks).toString("utf8");

    // The BOM and the semicolons are the whole point — without them Excel mangles
    // Vietnamese and drops every column into A.
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toContain("Huấn luyện viên;Số lớp");
    expect(text).toContain("\r\n");
  });
});
