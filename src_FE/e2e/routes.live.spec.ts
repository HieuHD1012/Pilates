import { test, expect, fixture, signIn, PASSWORD, API } from "./helpers/live";

let data: Awaited<ReturnType<typeof fixture>>;
test.beforeAll(async ({ request }) => {
  data = await fixture(request);
});
const routes = {
  ADMIN: [
    "/studio/tong-quan",
    "/studio/lich",
    "/studio/lich/:class",
    "/studio/khach-quan-tam",
    "/studio/hoc-vien",
    "/studio/hoc-vien/:student",
    "/studio/huan-luyen-vien",
    "/studio/huan-luyen-vien/:trainer",
    "/studio/goi-tap",
    "/studio/thanh-toan",
    "/studio/so-buoi",
    "/studio/gia-han",
    "/studio/bao-cao",
    "/studio/bao-cao/doanh-thu",
    "/studio/bao-cao/lop-hoc",
    "/studio/bao-cao/huan-luyen-vien",
    "/studio/tai-khoan",
    "/studio/thong-bao",
  ],
  STAFF: [
    "/studio/tong-quan",
    "/studio/lich",
    "/studio/hoc-vien",
    "/studio/thanh-toan",
    "/studio/gia-han",
    "/studio/bao-cao",
    "/studio/thong-bao",
  ],
  STUDENT: [
    "/hv",
    "/hv/lop-hoc",
    "/hv/lop-hoc/:class",
    "/hv/lich-cua-toi",
    "/hv/lich-su",
    "/hv/goi-tap",
    "/hv/tai-khoan",
  ],
  TRAINER: ["/hlv/hom-nay", "/hlv/lich-day", "/hlv/lop/:class", "/hlv/ho-so"],
};
for (const [role, paths] of Object.entries(routes)) {
  for (const template of paths)
    test(`${role}: real data screen ${template}`, async ({ page }) => {
      const target = template
        .replace(":class", String(data.session.id))
        .replace(":student", String(data.student.id))
        .replace(":trainer", String(data.trainer.id));
      const credentials =
        role === "ADMIN"
          ? {
              email: process.env.SEED_ADMIN_EMAIL!,
              password: process.env.SEED_ADMIN_PASSWORD!,
            }
          : role === "STAFF"
            ? data.staffAccount
            : role === "TRAINER"
              ? data.trainerAccount
              : data.studentAccount;
      await signIn(page, credentials.email, credentials.password ?? PASSWORD, target);
      await page.goto(target);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await expect(page.locator(".animate-skeleton")).toHaveCount(0);
      await expect(page.getByRole("alert")).toHaveCount(0);
      await page.reload();
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(target);
    });
}

test("STAFF and students cannot use ADMIN operations or another student's data", async ({
  page,
  request,
}) => {
  await signIn(page, data.staffAccount.email);
  await page.goto("/studio/tai-khoan");
  await expect(page).toHaveURL(/\/studio\/tong-quan$/);
  const staffToken = await page.evaluate(() => localStorage.getItem("soul:access-token"));
  expect(
    (
      await request.get(`${API}/accounts`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      })
    ).status(),
  ).toBe(403);
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await signIn(page, data.studentAccount.email);
  await page.goto("/studio/tong-quan");
  await expect(page).toHaveURL(/\/hv\/lop-hoc$/);
  expect(
    (
      await request.get(`${API}/reports/dashboard`, {
        headers: { Authorization: `Bearer ${data.studentToken}` },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get(`${API}/students/99999999`, {
        headers: { Authorization: `Bearer ${data.studentToken}` },
      })
    ).status(),
  ).toBe(404);
});
