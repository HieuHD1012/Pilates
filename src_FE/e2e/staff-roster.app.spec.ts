import { expect, test } from "@playwright/test";
import type { ClassSessionResponse } from "../app/lib/api/schema";
import { openDemo, readDemo } from "./helpers/demo";

test("staff roster reads names and exposes no booking-on-behalf action", async ({
  page,
}) => {
  await openDemo(page, "/studio/lich");
  const classes = await readDemo<ClassSessionResponse[]>(page, "/classes");
  const next = classes.find((item) => new Date(item.starts_at).getTime() > Date.now())!;
  await page.goto(`/studio/lich/${next.id}`);
  await expect(page.getByRole("heading", { name: /Học viên đã đăng ký/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Đặt hộ|Thêm học viên|Đổi buổi/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Đổi huấn luyện viên", exact: true }),
  ).toBeVisible();
});

test("TRAINER is redirected away from the staff roster", async ({ page }) => {
  await openDemo(page, "/studio/lich", "TRAINER");
  await expect(page).toHaveURL(/\/hlv\/hom-nay$/);
  await expect(page.getByRole("button", { name: "Thêm lớp", exact: true })).toHaveCount(0);
});
