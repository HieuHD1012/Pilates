import {
  test,
  expect,
  fixture,
  signIn,
  uid,
  phone,
  call,
  API,
  databaseFixture,
  PASSWORD,
} from "./helpers/live";
import type { LeadResponse, StudentResponse } from "../app/lib/api/schema";

test("public enquiry becomes a student through STAFF UI", async ({ page, request }) => {
  const data = await fixture(request);
  const name = `E2E khách ${uid()}`;
  const number = phone();
  await page.goto("/dat-tu-van");
  await page.getByLabel(/Họ và tên/).fill(name);
  await page.getByLabel(/Số điện thoại/).fill(number);
  await page.getByRole("button", { name: "Gửi thông tin", exact: true }).click();
  await expect(page.getByText(/Studio đã nhận|Đã nhận|Cảm ơn/).first()).toBeVisible();
  const leads = await call<LeadResponse[]>(
    request,
    "GET",
    "/leads?limit=200",
    undefined,
    data.token,
  );
  const lead = leads.find((item) => item.phone === number)!;
  expect(lead.full_name).toBe(name);
  await signIn(page, data.staffAccount.email);
  await page.goto(`/studio/khach-quan-tam/${lead.id}`);
  await page.getByRole("button", { name: "Chuyển thành học viên", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Tạo hồ sơ học viên", exact: true })
    .click();
  await expect(page).toHaveURL(/\/studio\/hoc-vien\/\d+$/);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const converted = await call<LeadResponse>(
    request,
    "GET",
    `/leads/${lead.id}`,
    undefined,
    data.token,
  );
  expect(converted.status).toBe("CONVERTED");
  const student = await call<StudentResponse>(
    request,
    "GET",
    `/students/${converted.converted_student_id}`,
    undefined,
    data.token,
  );
  expect(student.phone).toBe(number);
});

test("student changes profile and password through the real API", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  await signIn(page, data.studentAccount.email);
  await page.goto("/hv/tai-khoan");
  const name = `E2E hồ sơ ${uid()}`;
  await page.getByLabel("Họ và tên", { exact: false }).fill(name);
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByText("Đã lưu thông tin.", { exact: true })).toBeAttached();
  const me = await call<{ full_name: string }>(
    request,
    "GET",
    "/auth/me",
    undefined,
    data.studentToken,
  );
  expect(me.full_name).toBe(name);
  await page.getByLabel("Mật khẩu hiện tại", { exact: false }).fill(PASSWORD);
  await page.getByLabel(/^Mật khẩu mới/).fill("ci-changed-password-2026");
  await page.getByLabel(/Nhập lại mật khẩu mới/).fill("ci-changed-password-2026");
  await page.getByRole("button", { name: "Đổi mật khẩu", exact: true }).click();
  await expect(page.getByLabel(/^Mật khẩu hiện tại/)).toHaveValue("");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/dang-nhap/);
  await signIn(page, data.studentAccount.email, "ci-changed-password-2026");
});

type MailList = { messages: { ID: string; To: { Address: string }[] }[] };
async function resetUrl(request: Parameters<typeof fixture>[0], email: string) {
  const mailpit = process.env.MAILPIT_URL ?? "http://127.0.0.1:8025";
  let id = "";
  await expect
    .poll(async () => {
      const result = await request.get(`${mailpit}/api/v1/messages`);
      const rows = (await result.json()) as MailList;
      id =
        rows.messages.find((item) => item.To.some((to) => to.Address === email))?.ID ?? "";
      return id;
    })
    .not.toBe("");
  const body = (await (await request.get(`${mailpit}/api/v1/message/${id}`)).json()) as {
    Text: string;
    HTML: string;
  };
  const url = `${body.Text}\n${body.HTML}`.match(
    /http:\/\/localhost:\d+\/dat-lai-mat-khau\?token=[A-Za-z0-9_-]+/,
  )?.[0];
  expect(url).toBeDefined();
  return url!;
}

test("reset email is delivered locally; link works once and expired link is refused", async ({
  page,
  request,
}) => {
  // One forgot request per project: the default IP rate limit stays enabled.
  const data = await fixture(request);
  await page.goto("/quen-mat-khau");
  await page.getByLabel(/Email/).fill(data.studentAccount.email);
  await page.getByRole("button", { name: /Gửi/ }).click();
  const url = await resetUrl(request, data.studentAccount.email);
  await page.goto(url);
  await page
    .getByLabel("Mật khẩu mới", { exact: false })
    .first()
    .fill("ci-reset-password-2026");
  await page.getByLabel(/Nhập lại mật khẩu mới/).fill("ci-reset-password-2026");
  await page.getByRole("button", { name: "Lưu mật khẩu mới", exact: true }).click();
  await expect(page.getByRole("link", { name: /Đăng nhập/ }).first()).toBeVisible();
  await signIn(page, data.studentAccount.email, "ci-reset-password-2026");
  const used = new URL(url).searchParams.get("token");
  const duplicate = await request.post(`${API}/auth/reset-password`, {
    data: { token: used, new_password: PASSWORD },
  });
  expect(duplicate.status()).toBe(401);
  // Account reset resend has no public IP limiter; it prepares the expiry case.
  await call(
    request,
    "POST",
    `/accounts/${data.studentAccount.id}/send-password-reset`,
    undefined,
    data.token,
  );
  databaseFixture("expire-reset", data.studentAccount.id);
  await page.goto(await resetUrl(request, data.studentAccount.email));
  await page.getByLabel("Mật khẩu mới", { exact: false }).first().fill(PASSWORD);
  await page.getByLabel(/Nhập lại mật khẩu mới/).fill(PASSWORD);
  await page.getByRole("button", { name: "Lưu mật khẩu mới", exact: true }).click();
  await expect(page.getByText(/không còn hiệu lực|hết hạn/).first()).toBeVisible();
});

test("public real data routes and anonymous protected deep link", async ({ page }) => {
  for (const path of [
    "/",
    "/gioi-thieu",
    "/dich-vu",
    "/goi-tap",
    "/huan-luyen-vien",
    "/lich-tap",
    "/khuyen-mai",
    "/lien-he",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".animate-skeleton")).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
  await page.goto("/hv/goi-tap");
  await expect(page).toHaveURL(/dang-nhap\?next=/);
});
