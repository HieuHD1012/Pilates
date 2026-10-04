import { expect, test } from "@playwright/test";
import type { PackageLedgerResponse } from "../app/lib/api/schema";
import { openDemo, readDemo } from "./helpers/demo";

test("records pending money against a package and confirms the same receipt", async ({
  page,
}) => {
  await openDemo(page, "/studio/thanh-toan");
  await page.getByRole("button", { name: "Ghi nhận khoản thu", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Học viên/).selectOption("1");
  await expect(dialog.getByLabel(/Gói tập/)).toBeEnabled();
  await dialog.getByLabel(/Gói tập/).selectOption("1");
  await dialog.getByLabel(/Số tiền/).fill("1.000.000");
  await dialog.getByLabel(/Ghi chú|Nội dung/).fill("Thu kiểm thử tại quầy");
  const write = page.waitForResponse(
    (r) => r.url().endsWith("/api/payments") && r.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Ghi nhận", exact: true }).click();
  const response = await write;
  expect(response.status()).toBe(201);
  const receipt = await response.json();
  expect(receipt.student_package_id).toBe(1);
  expect(receipt.status).toBe("PENDING");
  await expect(dialog).toBeHidden();
  const pending = page.getByRole("listitem").filter({ hasText: "Thu kiểm thử tại quầy" });
  await pending.getByRole("button", { name: "Xác nhận đã nhận tiền", exact: true }).click();
  await expect(pending).toBeHidden();
  const row = page.getByRole("row").filter({ hasText: "Thu kiểm thử tại quầy" });
  await expect(row.getByText("Đã xác nhận", { exact: true })).toBeVisible();
});

test("adjusts the real ledger balance with an append-only reason", async ({ page }) => {
  await openDemo(page, "/studio/so-buoi?goi=1&hv=1");
  const before = await readDemo<PackageLedgerResponse>(page, "/packages/1/ledger");
  await page.getByRole("button", { name: "Điều chỉnh buổi", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Cộng hay trừ/).selectOption("add");
  await dialog.getByLabel(/Số buổi/).fill("2");
  await dialog.getByLabel(/Lý do/).fill("Bù buổi bảo trì thiết bị");
  await dialog.getByRole("button", { name: "Ghi bút toán", exact: true }).click();
  await expect(dialog).toBeHidden();
  const after = await readDemo<PackageLedgerResponse>(page, "/packages/1/ledger");
  expect(after.closing_balance).toBe(before.closing_balance + 2);
  expect(
    after.entries.some(
      (entry) => entry.note === "Bù buổi bảo trì thiết bị" && entry.delta === 2,
    ),
  ).toBe(true);
  await expect(page.getByText("Bù buổi bảo trì thiết bị").first()).toBeVisible();
});

test("a rejected negative amount cannot create a receipt", async ({ page }) => {
  await openDemo(page, "/studio/thanh-toan");
  await page.getByRole("button", { name: "Ghi nhận khoản thu", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Học viên/).selectOption("1");
  await expect(dialog.getByLabel(/Gói tập/)).toBeEnabled();
  await dialog.getByLabel(/Gói tập/).selectOption("1");
  await dialog.getByLabel(/Số tiền/).fill("-100");
  let posts = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/payments") && r.method() === "POST") posts++;
  });
  await dialog.getByRole("button", { name: "Ghi nhận", exact: true }).click();
  await expect(dialog.getByText(/không có dấu âm hoặc phần lẻ/)).toBeVisible();
  expect(posts).toBe(0);
});

test("keeps the receipt form open and blocks dismissal while a write is unresolved", async ({
  page,
}) => {
  await openDemo(page, "/studio/thanh-toan");
  await page.evaluate(() => {
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (String(input).endsWith("/api/payments") && init?.method === "POST") {
        await new Promise<void>((resolve) => {
          (window as Window & { releasePayment?: () => void }).releasePayment = resolve;
        });
      }
      return original(input, init);
    };
  });
  await page.getByRole("button", { name: "Ghi nhận khoản thu", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Học viên/).selectOption("1");
  await expect(dialog.getByLabel(/Gói tập/)).toBeEnabled();
  await dialog.getByLabel(/Gói tập/).selectOption("1");
  await dialog.getByLabel(/Số tiền/).fill("1000000");
  await dialog.getByRole("button", { name: "Ghi nhận", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Đóng", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Huỷ", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.evaluate(() =>
    (window as Window & { releasePayment?: () => void }).releasePayment?.(),
  );
  await expect(dialog).toBeHidden();
});
