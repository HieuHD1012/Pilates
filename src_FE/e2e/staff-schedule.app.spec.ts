import { expect, test, type Page } from "@playwright/test";

/**
 * The calendar becoming a working tool: schedule a class, move it, reassign the
 * trainer, cancel it.
 *
 * The rule worth an end-to-end test rather than a unit test is the trainer clash
 * (CONFIRMED, Q4) — it is a backend decision reached through three different
 * dialogs, and what breaks in practice is a screen that shows "trùng lịch" with
 * nothing the studio can act on.
 */

async function asStaff(page: Page, path: string) {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("soul:demo-role", "staff"));
  await page.goto(path);
}

test.describe("scheduling", () => {
  test("schedules a class, which appears on the week it was scheduled for", async ({
    page,
  }) => {
    await asStaff(page, "/studio/lich");
    await expect(page.getByRole("heading", { name: "Lịch & lớp học" })).toBeVisible();

    await page.getByRole("button", { name: "Thêm lớp" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Tên lớp/).fill("Reformer Chiều Muộn");
    await dialog.getByLabel(/Huấn luyện viên/).selectOption({ index: 1 });
    // Midday is free for every trainer on every day of the seed week: the last
    // morning class ends 10:20 and the earliest evening one starts 17:30.
    await dialog.getByLabel(/Giờ bắt đầu/).fill("12:00");
    await dialog.getByLabel(/Thời lượng/).selectOption("50");
    await dialog.getByLabel(/Sức chứa/).fill("5");
    // The end time is derived and shown, not typed.
    await expect(dialog.getByText(/12:50/)).toBeVisible();
    await dialog.getByRole("button", { name: "Thêm lớp" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Reformer Chiều Muộn").first()).toBeVisible();
  });

  test("refuses a class that double-books a trainer, and names the clash", async ({
    page,
  }) => {
    await asStaff(page, "/studio/lich");

    /**
     * Đọc xung đột ra khỏi lịch thật thay vì gõ cứng 06:30 — bản trước giả định
     * "hôm nay" là thứ Hai, và lớp 06:30 đổi huấn luyện viên theo từng ngày nên
     * test hỏng khi ngày hệ thống đi qua. Giờ nó tự lấy một buổi đang có rồi
     * xếp chồng lên đúng buổi đó.
     */
    await page.locator("button[aria-pressed]").first().click();
    const peek = page.getByRole("dialog");
    const day = (await peek.locator("p").first().innerText()).trim();
    const time = (
      await peek
        .getByText(/^\d{2}:\d{2}/)
        .first()
        .innerText()
    ).trim();
    const trainerRow = peek.locator("div").filter({ hasText: "Huấn luyện viên" }).last();
    const trainer = (await trainerRow.innerText()).replace(/Huấn luyện viên/, "").trim();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // "Thứ hai, 24/08/2026" → "2026-08-24"
    const m = day.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    expect(m, `không đọc được ngày từ "${day}"`).toBeTruthy();
    const date = `${m![3]}-${m![2]}-${m![1]}`;
    const start = time.slice(0, 5);

    await page.getByRole("button", { name: "Thêm lớp" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Tên lớp/).fill("Lớp chen giờ");
    await dialog.getByLabel(/Huấn luyện viên/).selectOption({ label: trainer });
    await dialog.locator('input[name="date"]').fill(date);
    await dialog.getByLabel(/Giờ bắt đầu/).fill(start);
    await dialog.getByLabel(/Sức chứa/).fill("4");
    await dialog.getByRole("button", { name: "Thêm lớp" }).click();

    const alert = dialog.getByRole("alert");
    await expect(alert).toContainText("đã có lớp trong khoảng giờ này");
    // Nói được là trùng với buổi nào, giờ nào — không chỉ "trùng lịch".
    await expect(alert).toContainText(/\d{2}:\d{2}/);
    await expect(dialog).toBeVisible();
  });

  test("reassigns the trainer from its own dialog, without touching the rest", async ({
    page,
  }) => {
    await asStaff(page, "/studio/lich");
    await page.locator("button[aria-pressed]").first().click();
    await page.getByRole("link", { name: "Mở lớp" }).click();
    await expect(page).toHaveURL(/\/studio\/lich\/c-/);

    const before = await page.getByRole("heading", { level: 1 }).innerText();

    await page.getByRole("button", { name: "Đổi huấn luyện viên" }).click();
    const dialog = page.getByRole("dialog");
    // Nothing to save until something changes.
    await expect(dialog.getByRole("button", { name: "Lưu" })).toBeDisabled();
    await dialog.getByLabel(/Huấn luyện viên/).selectOption({ index: 1 });
    await dialog.getByRole("button", { name: "Lưu" }).click();

    await expect(dialog).toBeHidden();
    // The class is the same class; only who teaches it moved.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(before);
  });

  test("will not shrink capacity below the number already booked", async ({ page }) => {
    await asStaff(page, "/studio/lich");
    await page.locator("button[aria-pressed]").first().click();
    await page.getByRole("link", { name: "Mở lớp" }).click();

    await page.getByRole("button", { name: "Sửa lớp" }).click();
    const dialog = page.getByRole("dialog");
    const hint = await dialog.getByText(/Đã có \d+ người đăng ký/).textContent();
    const booked = Number(hint?.match(/\d+/)?.[0] ?? "0");
    test.skip(booked === 0, "the first class of the seed week has nobody booked");

    await dialog.getByLabel(/Sức chứa/).fill("1");
    await dialog.getByRole("button", { name: "Lưu lớp" }).click();

    await expect(dialog.getByText(/không thể giảm sức chứa/)).toBeVisible();
  });

  test("cancels a class with a reason, and it stays cancelled", async ({ page }) => {
    await asStaff(page, "/studio/lich");
    await page.locator("button[aria-pressed]").first().click();
    await page.getByRole("link", { name: "Mở lớp" }).click();

    await page.getByRole("button", { name: "Hủy lớp" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Hủy lớp này" })).toBeDisabled();
    await dialog.getByLabel(/Lý do hủy/).fill("Huấn luyện viên nghỉ đột xuất");
    await dialog.getByRole("button", { name: "Hủy lớp này" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Đã hủy").first()).toBeVisible();
    // The reason is kept and labelled as a reason, not written over the class note.
    await expect(page.getByText(/Lý do hủy/)).toBeVisible();
    await expect(page.getByText("Huấn luyện viên nghỉ đột xuất")).toBeVisible();
    // A cancelled class offers no further edits — re-running it is a new class.
    await expect(page.getByRole("button", { name: "Sửa lớp" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Hủy lớp" })).toHaveCount(0);
  });
});

test.describe("recurring classes", () => {
  test("creates a weekly pattern and lists the occurrences it skipped", async ({
    page,
  }) => {
    await asStaff(page, "/studio/lich");

    await page.getByRole("button", { name: "Lớp định kỳ" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Tên lớp/).fill("Reformer Sáng Định Kỳ");
    await dialog.getByLabel(/Huấn luyện viên/).selectOption({ index: 1 });
    // 06:30 collides with the seed week's Monday, Tuesday-shifted classes and so
    // on — exactly the case worth testing: some occurrences land, some do not.
    await dialog.getByLabel(/Giờ bắt đầu/).fill("06:30");
    await dialog.getByLabel(/Sức chứa/).fill("6");

    const start = await dialog.locator('input[name="date"]').inputValue();
    // The visible control is the label; the checkbox itself is sr-only.
    await dialog.getByText("T2", { exact: true }).click();
    await dialog.getByText("T4", { exact: true }).click();
    await expect(dialog.getByLabel("Thứ hai")).toBeChecked();
    await expect(dialog.getByLabel("Thứ tư")).toBeChecked();

    // Three weeks out.
    const until = new Date(`${start}T00:00:00+07:00`);
    until.setUTCDate(until.getUTCDate() + 21);
    await dialog.getByLabel(/Lặp đến ngày/).fill(until.toISOString().slice(0, 10));

    // The count is shown before saving, and it is a count of attempts.
    await expect(dialog.getByText(/Sẽ tạo/)).toBeVisible();

    await dialog.getByRole("button", { name: "Tạo mẫu lặp" }).click();

    // Something was skipped, so the studio is told which dates and why.
    const report = page.getByRole("dialog");
    await expect(report).toContainText("Những buổi đã bỏ qua");
    await expect(report).toContainText("Trùng");
    await report.getByRole("button", { name: "Đã hiểu" }).click();
    await expect(report).toBeHidden();

    await expect(page.getByText("Reformer Sáng Định Kỳ").first()).toBeVisible();
  });

  test("will not create a pattern with no weekday chosen", async ({ page }) => {
    await asStaff(page, "/studio/lich");

    await page.getByRole("button", { name: "Lớp định kỳ" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Tên lớp/).fill("Mẫu thiếu ngày");
    await dialog.getByLabel(/Huấn luyện viên/).selectOption({ index: 1 });
    await dialog.getByLabel(/Giờ bắt đầu/).fill("12:00");
    await dialog.getByLabel(/Sức chứa/).fill("6");
    const start = await dialog.locator('input[name="date"]').inputValue();
    await dialog.getByLabel(/Lặp đến ngày/).fill(start);
    await dialog.getByRole("button", { name: "Tạo mẫu lặp" }).click();

    await expect(dialog.getByText("Chọn ít nhất một ngày trong tuần")).toBeVisible();
    await expect(dialog).toBeVisible();
  });
});
