import {
  test,
  expect,
  fixture,
  signIn,
  call,
  uid,
  phone,
  API,
  account,
} from "./helpers/live";
import type {
  StudentResponse,
  AccountResponse,
  TrainerResponse,
} from "../app/lib/api/schema";

test("ADMIN creates and edits student, invites linked account, edits and locks/unlocks login", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  const name = `E2E mới ${uid()}`;
  const email = `invite-${uid()}@example.com`;
  await signIn(page, process.env.SEED_ADMIN_EMAIL!, process.env.SEED_ADMIN_PASSWORD!);
  await page.goto("/studio/hoc-vien");
  await page.getByRole("button", { name: "Tạo học viên", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Họ và tên", { exact: false }).fill(name);
  await dialog.getByLabel("Số điện thoại", { exact: false }).fill(phone());
  await dialog.getByRole("button", { name: "Tạo hồ sơ", exact: true }).click();
  await expect(page).toHaveURL(/\/studio\/hoc-vien\/\d+$/);
  const id = Number(new URL(page.url()).pathname.split("/").at(-1));
  await page.getByRole("button", { name: "Sửa hồ sơ", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email", { exact: true }).fill(email);
  await dialog.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(
    (await call<StudentResponse>(request, "GET", `/students/${id}`, undefined, data.token))
      .email,
  ).toBe(email);
  await page.goto("/studio/tai-khoan");
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Họ và tên/).fill(name);
  await dialog.getByLabel(/Email đăng nhập/).fill(email);
  await dialog.getByLabel(/Hồ sơ học viên/).selectOption(String(id));
  await dialog.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await expect(dialog).toBeHidden();
  const row = page.getByRole("row").filter({ hasText: email });
  await expect(row).toBeVisible();
  const created = (
    await call<AccountResponse[]>(
      request,
      "GET",
      "/accounts?limit=200",
      undefined,
      data.token,
    )
  ).find((item) => item.email === email)!;
  expect(created.student_id).toBe(id);
  expect(created.status).toBe("PENDING_ACTIVATION");
  await row.getByRole("button", { name: "Sửa tài khoản", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Họ và tên", { exact: true }).fill(`${name} sửa`);
  await dialog.getByRole("button", { name: "Lưu tài khoản", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(
    (
      await call<AccountResponse>(
        request,
        "GET",
        `/accounts/${created.id}`,
        undefined,
        data.token,
      )
    ).full_name,
  ).toBe(`${name} sửa`);
  await row.getByRole("button", { name: /Gửi lại liên kết/ }).click();
  await expect(row.getByRole("button", { name: /Gửi lại liên kết/ })).toBeEnabled();
  await row.getByRole("button", { name: /Thao tác/ }).click();
  await page.getByRole("button", { name: "Khóa tài khoản", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Khóa tài khoản", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(
    (
      await call<AccountResponse>(
        request,
        "GET",
        `/accounts/${created.id}`,
        undefined,
        data.token,
      )
    ).is_active,
  ).toBe(false);
  await row.getByRole("button", { name: /Mở lại tài khoản/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Mở lại tài khoản", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(
    (
      await call<AccountResponse>(
        request,
        "GET",
        `/accounts/${created.id}`,
        undefined,
        data.token,
      )
    ).is_active,
  ).toBe(true);
});

test("ADMIN links new trainer profile to a TRAINER account and publishes it through UI", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  const login = await account(request, data.token, "TRAINER");
  const name = `E2E mới HLV ${uid()}`;
  await signIn(page, process.env.SEED_ADMIN_EMAIL!, process.env.SEED_ADMIN_PASSWORD!);
  await page.goto("/studio/huan-luyen-vien");
  await page.getByRole("button", { name: "Thêm huấn luyện viên", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Họ và tên/).fill(name);
  await dialog.getByLabel("Tài khoản HLV", { exact: false }).selectOption(String(login.id));
  await dialog.getByRole("button", { name: "Tạo hồ sơ HLV", exact: true }).click();
  await expect(page).toHaveURL(/\/studio\/huan-luyen-vien\/\d+$/);
  const id = Number(new URL(page.url()).pathname.split("/").at(-1));
  await page.getByRole("button", { name: "Sửa hồ sơ HLV", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Trang công khai", { exact: true }).selectOption("true");
  await dialog
    .getByLabel("Giới thiệu", { exact: true })
    .fill("Đồng hành trong từng buổi tập.");
  await dialog.getByRole("button", { name: "Lưu hồ sơ HLV", exact: true }).click();
  await expect(dialog).toBeHidden();
  const trainer = await call<TrainerResponse>(
    request,
    "GET",
    `/trainers/${id}`,
    undefined,
    data.token,
  );
  expect(trainer.user_id).toBe(login.id);
  expect(trainer.is_public).toBe(true);
  await page.evaluate(() => localStorage.clear());
  await signIn(page, login.email);
  await page.goto("/hlv/ho-so");
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  expect(
    (
      await request.get(`${API}/trainers/${data.trainer.id}`, {
        headers: {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem("soul:access-token"))}`,
        },
      })
    ).status(),
  ).toBe(404);
});

test("duplicate student phone preserves form; real offline write can be retried", async ({
  page,
  request,
}, info) => {
  const data = await fixture(request);
  await signIn(page, data.staffAccount.email);
  await page.goto("/studio/hoc-vien");
  await page.getByRole("button", { name: "Tạo học viên", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Họ và tên/).fill("E2E bản trùng");
  await dialog.getByLabel(/Số điện thoại/).fill(data.student.phone);
  await dialog.getByRole("button", { name: "Tạo hồ sơ", exact: true }).click();
  await expect(dialog.getByText(/đã thuộc|đã có/).first()).toBeVisible();
  await expect(dialog.getByLabel(/Họ và tên/)).toHaveValue("E2E bản trùng");
  await dialog.getByLabel(/Số điện thoại/).fill(phone());
  info.annotations.push({
    type: "expected-network-failure",
    description: "Offline POST /students retains form; explicit retry after reconnection.",
  });
  await page.context().setOffline(true);
  await dialog.getByRole("button", { name: "Tạo hồ sơ", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel(/Họ và tên/)).toHaveValue("E2E bản trùng");
  await page.context().setOffline(false);
  await dialog.getByRole("button", { name: "Tạo hồ sơ", exact: true }).click();
  await expect(page).toHaveURL(/\/studio\/hoc-vien\/\d+$/);
});
