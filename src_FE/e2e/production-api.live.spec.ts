import { type APIRequestContext } from "@playwright/test";
import { expect, test } from "./helpers/live";

const base = process.env.LIVE_API_URL ?? "http://127.0.0.1:8000";
const password = "ci-disposable-password-2026";

async function post(
  request: APIRequestContext,
  path: string,
  data: unknown,
  token?: string,
) {
  const response = await request.post(`${base}${path}`, {
    data,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  expect(response.ok(), `${path}: ${response.status()} ${await response.text()}`).toBe(
    true,
  );
  return response.json();
}

test("built student UI books and cancels against the real ledger and role boundaries", async ({
  page,
  request,
}) => {
  const suffix = Date.now().toString();
  const admin = await post(request, "/auth/login", {
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  const token = admin.access_token as string;
  const student = await post(
    request,
    "/students",
    {
      full_name: `Kiểm thử ${suffix}`,
      phone: `090${suffix.slice(-7)}`,
    },
    token,
  );
  const email = `student-${suffix}@example.com`;
  await post(
    request,
    "/accounts",
    { email, password, role: "STUDENT", student_id: student.id },
    token,
  );
  const trainer = await post(
    request,
    "/trainers",
    { full_name: `HLV kiểm thử ${suffix}` },
    token,
  );
  const type = await post(
    request,
    "/package-types",
    {
      name: "Gói kiểm thử",
      price: "1000000.00",
      credits: 10,
      duration_days: 90,
      class_type: "GROUP",
    },
    token,
  );
  const sold = await post(
    request,
    "/packages/sell",
    { student_id: student.id, package_type_id: type.id },
    token,
  );
  const starts = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const session = await post(
    request,
    "/classes",
    {
      starts_at: starts.toISOString(),
      ends_at: new Date(starts.getTime() + 50 * 60 * 1000).toISOString(),
      trainer_id: trainer.id,
      class_type: "GROUP",
      capacity: 1,
    },
    token,
  );

  await page.goto("/dang-nhap");
  await page.getByLabel(/Email/).fill(email);
  await page.getByLabel(/Mật khẩu/).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/hv\/lop-hoc$/);
  await page.goto(`/hv/lop-hoc/${session.id}`);
  await page.getByRole("button", { name: "Đặt lớp này", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận đặt", exact: true })
    .click();
  await expect(page.getByText("Bạn đã có chỗ trong buổi này.")).toBeVisible();

  const ledger = async () => {
    const response = await request.get(`${base}/packages/${sold.id}/ledger`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBe(true);
    return response.json();
  };
  expect((await ledger()).closing_balance).toBe(9);
  const stored = await page.evaluate(() => localStorage.getItem("soul:access-token"));
  const forbidden = await request.get(`${base}/reports/dashboard`, {
    headers: { Authorization: `Bearer ${stored}` },
  });
  expect(forbidden.status()).toBe(403);
  // No mock worker or fixture responses in the deployed topology.
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);

  await page.getByRole("link", { name: "Xem lịch của tôi", exact: true }).click();
  await page.getByRole("button", { name: "Hủy buổi", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("hoàn");
  await dialog.getByRole("button", { name: "Hủy buổi", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect((await ledger()).closing_balance).toBe(10);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Lịch của tôi", exact: true }),
  ).toBeVisible();
});
