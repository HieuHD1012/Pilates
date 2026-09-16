import { expect, test, type Page } from "@playwright/test";

/**
 * The first write path in the studio app, end to end against the fixture layer.
 *
 * Worth an e2e test rather than a unit test because what breaks in practice is
 * the seam, not the form: a created record that the detail route then cannot
 * find, or a cache that is not invalidated so the new row never appears.
 */

const NAME = "Phạm Thị Quỳnh Anh";
const PHONE = "0938 111 222";

async function signInAsStaff(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("soul:demo-role", "staff"));
  await page.goto("/studio/hoc-vien");
  await expect(page.getByRole("heading", { name: "Học viên" })).toBeVisible();
}

test.describe("staff writes", () => {
  test("creates a student, opens the new profile, then edits it", async ({ page }) => {
    await signInAsStaff(page);

    await page.getByRole("button", { name: "Tạo học viên" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Họ và tên").fill(NAME);
    await dialog.getByLabel("Số điện thoại").fill(PHONE);
    await dialog.getByRole("button", { name: "Tạo hồ sơ", exact: true }).click();

    // The new record resolves on its own route — proof the create and the read
    // agree on the id.
    await expect(page.getByRole("heading", { name: NAME })).toBeVisible();
    await expect(page).toHaveURL(/\/studio\/hoc-vien\/s-/);

    // A new record reports the day it was created, not the seed roster's date.
    await expect(page.getByText("Chưa có gói")).toBeVisible();

    await page.getByRole("button", { name: "Sửa hồ sơ" }).click();
    const edit = page.getByRole("dialog");
    await edit.getByLabel("Họ và tên").fill("Phạm Quỳnh Anh");
    await edit.getByLabel("Email").fill("quynhanh@example.com");
    await edit.getByRole("button", { name: "Lưu hồ sơ" }).click();

    await expect(page.getByRole("heading", { name: "Phạm Quỳnh Anh" })).toBeVisible();
    // The optional fields were being accepted and silently dropped.
    await expect(page.getByText("quynhanh@example.com")).toBeVisible();
  });

  test("refuses a second student on a phone number already in use", async ({ page }) => {
    await signInAsStaff(page);

    // Created by this test, so the duplicate is real rather than a fixture the
    // demo roster might one day stop shipping.
    await page.getByRole("button", { name: "Tạo học viên" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Họ và tên").fill("Nguyễn Văn Gốc");
    await dialog.getByLabel("Số điện thoại").fill("0977 654 321");
    await dialog.getByRole("button", { name: "Tạo hồ sơ", exact: true }).click();
    await expect(page).toHaveURL(/\/studio\/hoc-vien\/s-/);

    // Client-side back, not page.goto: MSW state lives in the page, so a reload
    // would discard the record this test just created.
    await page.goBack();
    await expect(page.getByRole("cell", { name: "Nguyễn Văn Gốc" })).toBeVisible();

    await page.getByRole("button", { name: "Tạo học viên" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Họ và tên").fill("Trùng Số Điện Thoại");
    await dialog.getByLabel("Số điện thoại").fill("0977654321");
    await dialog.getByRole("button", { name: "Tạo hồ sơ", exact: true }).click();

    await expect(dialog.getByText("Số điện thoại này đã có hồ sơ học viên.")).toBeVisible();
    // The dialog stays open on its own field error, and nothing was created.
    await expect(page).toHaveURL(/\/studio\/hoc-vien$/);
  });

  test("converts an enquiry into a student and links the two records", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("soul:demo-role", "staff"));
    await page.goto("/studio/khach-quan-tam");
    await expect(page.getByRole("heading", { name: "Khách quan tâm" })).toBeVisible();

    await page
      .getByRole("link", { name: /Khách Demo/ })
      .first()
      .click();
    // The URL changes before the detail renders, so wait for something only the
    // detail has before reading its heading.
    const convert = page.getByRole("button", { name: "Chuyển thành học viên" });
    await convert.waitFor();
    const leadName = await page.getByRole("heading", { level: 1 }).innerText();

    await convert.click();
    const dialog = page.getByRole("dialog");
    // Prefilled from the enquiry — staff should not retype what the studio has.
    await expect(dialog.getByLabel("Họ và tên")).toHaveValue(leadName);
    await dialog.getByRole("button", { name: "Tạo hồ sơ học viên" }).click();

    await expect(page).toHaveURL(/\/studio\/hoc-vien\/s-/);
    await expect(page.getByRole("heading", { name: leadName })).toBeVisible();
  });
});
