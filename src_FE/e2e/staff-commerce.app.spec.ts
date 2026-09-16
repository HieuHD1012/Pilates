import { expect, test, type Page } from "@playwright/test";

/**
 * The money paths, end to end against the fixture layer.
 *
 * What these catch is the seam, not the form: a receipt that records fine but
 * never reaches the student's profile or the revenue report, and a ledger entry
 * that moves the balance on one screen and not the others.
 */

async function asStaff(page: Page, path: string) {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("soul:demo-role", "staff"));
  await page.goto(path);
}

test.describe("payments", () => {
  test("records a payment, which reaches the student's profile", async ({ page }) => {
    await asStaff(page, "/studio/thanh-toan");
    await expect(page.getByRole("heading", { name: "Thanh toán" })).toBeVisible();

    await page.getByRole("button", { name: "Ghi nhận khoản thu" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Học viên/).selectOption({ index: 1 });
    const student = await dialog
      .getByLabel(/Học viên/)
      .evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent ?? "");
    await dialog.getByLabel(/Số tiền/).fill("3.150.000");
    await dialog.getByLabel(/Nội dung/).fill("Học phí tháng 8, thu tại quầy");
    await dialog.getByRole("button", { name: "Ghi nhận" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("3.150.000 ₫").first()).toBeVisible();

    // The same record on the student it belongs to — a different query, a
    // different endpoint, so worth asserting rather than assuming.
    await page.getByRole("link", { name: student.trim() }).first().click();
    await expect(page).toHaveURL(/\/studio\/hoc-vien\/s-/);
    await page.getByRole("tab", { name: "Gói & thanh toán" }).click();
    await expect(page.getByText("Học phí tháng 8, thu tại quầy")).toBeVisible();
  });

  test("confirms a pending payment so it can count as revenue", async ({ page }) => {
    await asStaff(page, "/studio/thanh-toan");

    await page.getByRole("button", { name: "Ghi nhận khoản thu" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Học viên/).selectOption({ index: 1 });
    await dialog.getByLabel(/Số tiền/).fill("1000000");
    await dialog.getByLabel(/Nội dung/).fill("Chuyển khoản khách báo đã gửi");
    await dialog.getByLabel(/Trạng thái/).selectOption("pending");
    await dialog.getByRole("button", { name: "Ghi nhận" }).click();
    await expect(dialog).toBeHidden();

    const row = page.getByRole("row").filter({ hasText: "Chuyển khoản khách báo đã gửi" });
    await expect(row.getByText("Chờ xác nhận")).toBeVisible();
    await row.getByRole("button", { name: "Xác nhận" }).click();
    await expect(row.getByText("Đã xác nhận")).toBeVisible();
  });

  test("voids a payment only with a stated reason, and keeps the record", async ({
    page,
  }) => {
    await asStaff(page, "/studio/thanh-toan");

    await page.getByRole("button", { name: "Ghi nhận khoản thu" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Học viên/).selectOption({ index: 1 });
    await dialog.getByLabel(/Số tiền/).fill("500000");
    await dialog.getByLabel(/Nội dung/).fill("Phiếu ghi trùng cần hủy");
    await dialog.getByRole("button", { name: "Ghi nhận" }).click();
    await expect(dialog).toBeHidden();

    const row = page.getByRole("row").filter({ hasText: "Phiếu ghi trùng cần hủy" });
    await row.getByRole("button", { name: "Hủy phiếu" }).click();
    dialog = page.getByRole("dialog");

    // The confirm button stays out of reach until a reason exists.
    await expect(dialog.getByRole("button", { name: "Hủy phiếu này" })).toBeDisabled();
    await dialog.getByLabel(/Lý do hủy/).fill("Ghi trùng với phiếu trước");
    await dialog.getByRole("button", { name: "Hủy phiếu này" }).click();

    await expect(dialog).toBeHidden();
    // Voided, not deleted: the row and its reason stay in the log.
    await expect(row.getByText("Đã hủy")).toBeVisible();
    await expect(row.getByText("Ghi trùng với phiếu trước")).toBeVisible();
  });
});

test.describe("session ledger", () => {
  test("adjusts a balance with a reason, and the balance moves everywhere", async ({
    page,
  }) => {
    await asStaff(page, "/studio/hoc-vien/s-01");
    await page.getByRole("tab", { name: "Gói & thanh toán" }).click();
    await page.getByRole("link", { name: "Xem sổ buổi" }).click();

    await expect(page.getByRole("heading", { name: "Sổ buổi" })).toBeVisible();
    // The screen names the student and package rather than printing a raw id.
    await expect(page.getByText("Học viên Demo 01").first()).toBeVisible();

    await page.getByRole("button", { name: "Điều chỉnh buổi" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Cộng hay trừ/).selectOption("add");
    await dialog.getByLabel(/Số buổi/).fill("2");
    await dialog.getByLabel(/Lý do/).fill("Bù hai buổi studio đóng cửa sửa sàn");
    await dialog.getByRole("button", { name: "Ghi bút toán" }).click();

    await expect(dialog).toBeHidden();
    // Desktop table and phone list are both in the DOM, one display:none — so
    // `.first()` rather than a strict single match.
    await expect(
      page.getByText("Bù hai buổi studio đóng cửa sửa sàn").first(),
    ).toBeVisible();

    // 4 + 2. The ledger sums to it, and the roster row must agree — the balance
    // is one number the whole product reads.
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.getByRole("link", { name: "Học viên Demo 01" }).first().click();
    await expect(page).toHaveURL(/\/studio\/hoc-vien\/s-01/);
    await expect(page.getByText("6 buổi").first()).toBeVisible();
  });

  test("clears the renewal flag when the balance moves above the threshold", async ({
    page,
  }) => {
    await asStaff(page, "/studio/so-buoi?goi=sp-demo-1");

    await page.getByRole("button", { name: "Điều chỉnh buổi" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Cộng hay trừ/).selectOption("add");
    await dialog.getByLabel(/Số buổi/).fill("20");
    await dialog.getByLabel(/Lý do/).fill("Chuyển gói, cộng lại số buổi đã mua");
    await dialog.getByRole("button", { name: "Ghi bút toán" }).click();
    await expect(dialog).toBeHidden();

    // 24 sessions in hand, so the confirmed 6-session threshold no longer applies
    // and the student must drop off the renewal list.
    await page.getByRole("link", { name: "Học viên Demo 01" }).first().click();
    await expect(page.getByText("24 buổi").first()).toBeVisible();
    await expect(page.getByText("Cần gia hạn")).toHaveCount(0);
  });

  test("refuses an adjustment with no reason", async ({ page }) => {
    await asStaff(page, "/studio/so-buoi?goi=sp-demo-1");

    await page.getByRole("button", { name: "Điều chỉnh buổi" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Số buổi/).fill("1");
    await dialog.getByRole("button", { name: "Ghi bút toán" }).click();

    await expect(dialog.getByText(/Nêu lý do đủ rõ/)).toBeVisible();
    await expect(dialog).toBeVisible();
  });
});
