import { expect, test, type Page } from "@playwright/test";

/**
 * A student getting out of a buổi they booked.
 *
 * Both the endpoint and the cancel hook had existed since booking was built and
 * nothing on any screen called them — a student could book and then had no way
 * out. These tests exist so that cannot happen again quietly.
 */

async function asStudent(page: Page, path: string) {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("soul:demo-role"));
  await page.goto(path);
}

/**
 * Books a class the student can actually book, so there is something to act on.
 * The list marks each row, so pick a row the list itself calls bookable.
 */
async function bookSomething(page: Page) {
  await asStudent(page, "/hv/lop-hoc");
  await page.getByRole("heading", { level: 1 }).waitFor();

  // The list shows one day at a time, and today's remaining buổi may be full.
  // Walk the day strip until a row the list itself calls bookable turns up.
  const days = page.locator("button, [role='tab']").filter({ hasText: /^T[2-7]|^CN/ });
  const dayCount = await days.count();
  let bookable = page
    .locator("a[href^='/hv/lop-hoc/']")
    .filter({ hasText: /Còn \d+ chỗ/ })
    .first();
  for (let i = 0; i < dayCount && (await bookable.count()) === 0; i += 1) {
    await days.nth(i).click();
    await page.waitForTimeout(400);
    bookable = page
      .locator("a[href^='/hv/lop-hoc/']")
      .filter({ hasText: /Còn \d+ chỗ/ })
      .first();
  }
  await expect(bookable).toBeVisible();
  await bookable.click();
  await expect(page).toHaveURL(/\/hv\/lop-hoc\/c-/);

  const book = page.getByRole("button", { name: "Đặt lớp này" });
  await expect(book).toBeEnabled();
  await book.click();
  // Booking is a transaction, so it asks first.
  const confirm = page.getByRole("dialog");
  await confirm.getByRole("button", { name: "Xác nhận đặt" }).click();
  await expect(confirm).toBeHidden();

  // Client-side navigation, not page.goto: MSW state lives in the page, so a
  // reload would discard the booking this helper just made.
  await page.getByRole("link", { name: "Lịch của tôi" }).first().click();
  await expect(page.getByRole("heading", { name: "Lịch của tôi" })).toBeVisible();
}

test.describe("student schedule", () => {
  test("moves a booking to another buổi without charging a second one", async ({
    page,
  }) => {
    await bookSomething(page);

    const change = page.getByRole("button", { name: "Đổi buổi" }).first();
    await expect(change).toBeVisible();
    await change.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("không trừ thêm buổi nào");
    await dialog.getByLabel(/Đổi sang buổi/).selectOption({ index: 1 });
    await dialog.getByRole("button", { name: "Đổi buổi" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(/Đã đổi buổi/)).toBeVisible();
  });

  test("cancels a booking and states which way the refund went", async ({ page }) => {
    await bookSomething(page);

    const cancel = page.getByRole("button", { name: "Hủy buổi" }).first();
    await expect(cancel).toBeVisible();
    await cancel.click();

    const dialog = page.getByRole("dialog");
    // The refund outcome is stated before the button, not after.
    await expect(dialog).toContainText(/sẽ được hoàn lại|sẽ không được hoàn lại/);
    await dialog.getByRole("button", { name: "Hủy buổi" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(/Đã hủy buổi/)).toBeVisible();
  });
});
