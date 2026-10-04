import { createHmac } from "node:crypto";
import { test, expect, fixture, signIn, API } from "./helpers/live";

test("expired access token refreshes once after reload and logout revokes the refresh session", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  await signIn(page, data.studentAccount.email);
  const original = await page.evaluate(() => localStorage.getItem("soul:access-token"));
  const [header, body] = original!.split(".");
  const claims = JSON.parse(Buffer.from(body!, "base64url").toString());
  claims.exp = Math.floor(Date.now() / 1000) - 60;
  const payload = `${header}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}`;
  const expired = `${payload}.${createHmac("sha256", process.env.JWT_SECRET!).update(payload).digest("base64url")}`;
  await page.evaluate((value) => localStorage.setItem("soul:access-token", value), expired);
  let rotations = 0;
  page.on("response", (response) => {
    if (response.url() === `${API}/auth/refresh` && response.status() === 200) rotations++;
  });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect.poll(() => rotations).toBe(1);
  const tokens = await page.evaluate(() => ({
    access: localStorage.getItem("soul:access-token"),
    refresh: localStorage.getItem("soul:refresh-token"),
  }));
  expect(tokens.access).not.toBe(expired);
  await page.goto("/hv/tai-khoan");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận đăng xuất", exact: true })
    .click();
  await expect(page).toHaveURL(/dang-nhap/);
  expect(
    (
      await request.post(`${API}/auth/refresh`, { data: { refresh_token: tokens.refresh } })
    ).status(),
  ).toBe(401);
  await page.goto("/hv/lich-cua-toi");
  await expect(page).toHaveURL(/dang-nhap\?next=/);
});

test("ADMIN locking an active student revokes its session; unlocking allows UI login again", async ({
  page,
  request,
  browser,
  observePage,
}) => {
  const data = await fixture(request);
  await signIn(page, data.studentAccount.email);
  // The student remains mobile; the administrator uses its desktop workspace.
  const context = await browser.newContext({
    baseURL: "http://localhost:4173",
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    hasTouch: false,
  });
  try {
    const admin = await context.newPage();
    observePage(admin);
    await signIn(admin, process.env.SEED_ADMIN_EMAIL!, process.env.SEED_ADMIN_PASSWORD!);
    await admin.goto("/studio/tai-khoan");
    const row = admin.getByRole("row").filter({ hasText: data.studentAccount.email });
    await row.getByRole("button", { name: /Thao tác/ }).click();
    await admin.getByRole("button", { name: "Khóa tài khoản", exact: true }).click();
    await admin
      .getByRole("dialog")
      .getByRole("button", { name: "Khóa tài khoản", exact: true })
      .click();
    await expect(admin.getByRole("dialog")).toBeHidden();
    await page.reload();
    await expect(page).toHaveURL(/dang-nhap/);
    expect(
      (
        await request.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${data.studentToken}` },
        })
      ).status(),
    ).toBe(401);
    await row.getByRole("button", { name: /Mở lại tài khoản/ }).click();
    await admin
      .getByRole("dialog")
      .getByRole("button", { name: "Mở lại tài khoản", exact: true })
      .click();
    await expect(admin.getByRole("dialog")).toBeHidden();
    await signIn(page, data.studentAccount.email);
  } finally {
    await context.close();
  }
});
