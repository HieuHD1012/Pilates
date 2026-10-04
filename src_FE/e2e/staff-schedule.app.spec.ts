import { expect, test } from "@playwright/test";
import type { ClassSessionResponse } from "../app/lib/api/schema";
import { openDemo, readDemo, studioDay } from "./helpers/demo";

test("creates a class with an explicit studio time offset", async ({ page }) => {
  await openDemo(page, "/studio/lich");
  await page.getByRole("button", { name: "Thêm lớp", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Huấn luyện viên/).selectOption("1");
  await dialog.getByLabel(/Ngày/).fill(studioDay(1));
  await dialog.getByLabel(/Giờ bắt đầu/).fill("22:00");
  await dialog.getByLabel(/Sức chứa/).fill("6");
  const write = page.waitForResponse(
    (r) => r.url().endsWith("/api/classes") && r.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Thêm lớp", exact: true }).click();
  const response = await write;
  expect(response.status()).toBe(201);
  const payload = response.request().postDataJSON();
  expect(payload.starts_at).toBe(`${studioDay(1)}T22:00:00+07:00`);
  expect(payload.ends_at).toBe(`${studioDay(1)}T22:50:00+07:00`);
  await expect(dialog).toBeHidden();
});

test("recurrence cannot preview without a weekday", async ({ page }) => {
  await openDemo(page, "/studio/lich");
  await page.getByRole("button", { name: "Lớp định kỳ", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Huấn luyện viên/).selectOption("1");
  await dialog.getByLabel(/Ngày/).fill(studioDay(1));
  await dialog.getByLabel(/Giờ bắt đầu/).fill("22:00");
  await dialog.getByLabel(/Sức chứa/).fill("6");
  await dialog.getByLabel(/Lặp đến ngày/).fill(studioDay(8));
  await dialog.getByRole("button", { name: /Xem trước/ }).click();
  await expect(dialog.getByText("Chọn ít nhất một ngày trong tuần")).toBeVisible();
});

test("class cancellation records its reason; time/capacity have no edit action", async ({
  page,
}) => {
  await openDemo(page, "/studio/lich");
  const items = await readDemo<ClassSessionResponse[]>(page, "/classes");
  const item = items.find(
    (row) => new Date(row.starts_at).getTime() > Date.now() + 86400000,
  )!;
  await page.goto(`/studio/lich/${item.id}`);
  await expect(
    page.getByRole("button", { name: /Sửa lớp|Đổi giờ|Sửa sức chứa/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Hủy lớp", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Lý do hủy/).fill("Studio bảo trì thiết bị");
  await dialog.getByRole("button", { name: "Hủy lớp", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/Studio bảo trì thiết bị/).first()).toBeVisible();
  expect((await readDemo<ClassSessionResponse>(page, `/classes/${item.id}`)).status).toBe(
    "CANCELLED",
  );
});
