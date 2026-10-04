import {
  test,
  expect,
  fixture,
  signIn,
  call,
  uid,
  phone,
  API,
  studioDay,
} from "./helpers/live";
import type {
  StudentResponse,
  ClassSessionResponse,
  ClassStatsResponse,
} from "../app/lib/api/schema";

test("over 200 students paginate, search resets the page, missing optional email stays absent, and selectors load every page", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const data = await fixture(request);
  const prefix = `E2E pagination ${uid()}`;
  const students: StudentResponse[] = [];
  // API fixtures are deliberately separate from the browser operation being tested.
  for (let index = 0; index < 201; index++)
    students.push(
      await call<StudentResponse>(
        request,
        "POST",
        "/students",
        { full_name: `${prefix} ${String(index).padStart(3, "0")}`, phone: phone() },
        data.token,
      ),
    );
  await signIn(page, data.staffAccount.email);
  await page.goto("/studio/hoc-vien");
  await page.getByRole("searchbox", { name: "Tìm học viên" }).fill(prefix);
  await expect(
    page.getByRole("link", { name: students[0]!.full_name, exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.getByText("Trang 2", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: students[200]!.full_name, exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Trang sau", exact: true })).toBeDisabled();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: students[200]!.full_name })
      .getByText("Chưa ghi"),
  ).toBeVisible();
  await page.getByRole("searchbox", { name: "Tìm học viên" }).fill(`no-match-${uid()}`);
  await expect(
    page.getByText("Không có học viên nào khớp bộ lọc", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Trang 2", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Bỏ bộ lọc", exact: true }).click();
  await expect(page.getByRole("button", { name: "Trang sau", exact: true })).toBeEnabled();
  await page.goto("/studio/thanh-toan");
  await page.getByRole("button", { name: "Ghi nhận khoản thu", exact: true }).click();
  const options = page.getByRole("dialog").getByLabel("Học viên", { exact: false });
  await expect(
    options.locator("option").filter({ hasText: students[200]!.full_name }),
  ).toHaveCount(1);
});

test("class crosses studio midnight without shifting its start date; empty reports preserve nullable ratios", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  const session = await call<ClassSessionResponse>(
    request,
    "POST",
    "/classes",
    {
      trainer_id: data.trainer.id,
      class_type: "GROUP",
      capacity: 3,
      starts_at: `${studioDay(5)}T23:45:00+07:00`,
      ends_at: `${studioDay(6)}T00:35:00+07:00`,
    },
    data.token,
  );
  await signIn(page, data.staffAccount.email);
  await page.goto(`/studio/lich/${session.id}`);
  await expect(page.getByText(/23:45/).first()).toBeVisible();
  await expect(page.getByText(/00:35/).first()).toBeVisible();
  await page.goto("/studio/bao-cao/lop-hoc");
  await page.getByLabel("Từ ngày", { exact: true }).fill("2000-01-01");
  const empty = page.waitForResponse(
    (response) =>
      response.url().startsWith(`${API}/reports/classes?`) &&
      new URL(response.url()).searchParams.get("period_end") === "2000-01-02",
  );
  await page.getByLabel("Đến ngày", { exact: true }).fill("2000-01-02");
  const report = (await (await empty).json()) as ClassStatsResponse;
  expect(report.scheduled_sessions).toBe(0);
  expect(report.fill_rate).toBeNull();
  await expect(
    page.getByText("Không có lớp nào trong khoảng ngày này", { exact: true }),
  ).toBeVisible();
});
