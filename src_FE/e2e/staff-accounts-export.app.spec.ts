import { expect, test } from "@playwright/test";
import { openDemo } from "./helpers/demo";

test("invites an account by email without choosing its password", async ({ page }) => {
  await openDemo(page, "/studio/tai-khoan");
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator('input[type="password"]')).toHaveCount(0);
  await dialog.getByLabel(/Họ và tên/).fill("Vũ Minh Khang");
  await dialog.getByLabel(/Email/).fill("khang@example.com");
  await dialog.getByLabel(/Quyền/).selectOption("TRAINER");
  await expect(dialog).toContainText("điểm danh");
  await dialog.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Vũ Minh Khang").first()).toBeVisible();
  await expect(page.getByText("khang@example.com").first()).toBeVisible();
});

test("STAFF cannot open ADMIN account management", async ({ page }) => {
  await openDemo(page, "/studio/tai-khoan", "STAFF");
  await expect(page).toHaveURL(/\/studio\/tong-quan$/);
  await expect(page.getByRole("link", { name: "Tài khoản", exact: true })).toHaveCount(0);
});

test("downloads the trainer CSV through the report export endpoint", async ({ page }) => {
  await openDemo(page, "/studio/bao-cao/huan-luyen-vien");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.csv$/);
  expect(await file.failure()).toBeNull();
});
