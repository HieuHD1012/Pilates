import { test, expect, account, adminToken, signIn, uid, call, API } from "./helpers/live";
import type { AnnouncementResponse, PublicAnnouncement } from "../app/lib/api/schema";

test("STAFF creates, edits, publishes, hides and deletes announcements through the UI", async ({
  page,
  request,
  observePage,
}) => {
  const token = await adminToken(request);
  const staff = await account(request, token, "STAFF");
  const title = `Thông báo E2E ${uid()}`;
  await signIn(page, staff.email);
  await page.goto("/studio/thong-bao");
  await page.getByRole("button", { name: "Thêm thông báo", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tiêu đề", { exact: false }).fill(title);
  await dialog
    .getByLabel("Nội dung", { exact: false })
    .fill("Nội dung kiểm chứng API thật.");
  await dialog.getByRole("button", { name: "Lưu thông báo", exact: true }).click();
  await expect(dialog).toBeHidden();
  const rows = await call<AnnouncementResponse[]>(
    request,
    "GET",
    "/announcements?limit=200",
    undefined,
    token,
  );
  const row = rows.find((item) => item.title === title)!;
  expect(row.is_published).toBe(false);
  const visitor = await page.context().newPage();
  observePage(visitor);
  let publicRead = visitor.waitForResponse((response) =>
    response.url().startsWith(`${API}/public/announcements`),
  );
  await visitor.goto("/khuyen-mai");
  expect(
    ((await (await publicRead).json()) as PublicAnnouncement[]).some(
      (item) => item.title === title,
    ),
  ).toBe(false);
  await expect(visitor.locator(".animate-skeleton")).toHaveCount(0);
  await expect(visitor.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
  const edit = async () => {
    const item = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await item.getByRole("button", { name: `Thao tác cho ${title}`, exact: true }).click();
    await page.getByRole("button", { name: "Sửa thông báo", exact: true }).click();
    return page.getByRole("dialog");
  };
  dialog = await edit();
  await dialog
    .getByLabel("Nội dung", { exact: false })
    .fill("Nội dung đã sửa qua giao diện.");
  await dialog.getByLabel("Trạng thái", { exact: true }).selectOption("published");
  await dialog.getByRole("button", { name: "Lưu thông báo", exact: true }).click();
  await expect(dialog).toBeHidden();
  publicRead = visitor.waitForResponse((response) =>
    response.url().startsWith(`${API}/public/announcements`),
  );
  await visitor.reload();
  expect(
    ((await (await publicRead).json()) as PublicAnnouncement[]).some(
      (item) => item.title === title,
    ),
  ).toBe(true);
  await expect(visitor.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(
    visitor.getByText("Nội dung đã sửa qua giao diện.", { exact: true }),
  ).toBeVisible();
  dialog = await edit();
  await dialog.getByLabel("Trạng thái", { exact: true }).selectOption("draft");
  await dialog.getByRole("button", { name: "Lưu thông báo", exact: true }).click();
  await expect(dialog).toBeHidden();
  publicRead = visitor.waitForResponse((response) =>
    response.url().startsWith(`${API}/public/announcements`),
  );
  await visitor.reload();
  expect(
    ((await (await publicRead).json()) as PublicAnnouncement[]).some(
      (item) => item.title === title,
    ),
  ).toBe(false);
  await expect(visitor.locator(".animate-skeleton")).toHaveCount(0);
  await expect(visitor.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: `Thao tác cho ${title}`, exact: true }).click();
  await page.getByRole("button", { name: "Xóa thông báo", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xóa thông báo", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(
    (
      await call<AnnouncementResponse[]>(
        request,
        "GET",
        "/announcements?limit=200",
        undefined,
        token,
      )
    ).some((item) => item.id === row.id),
  ).toBe(false);
  expect(
    (
      await request.get(`${API}/announcements`, {
        headers: { Authorization: "Bearer invalid" },
      })
    ).status(),
  ).toBe(401);
  await visitor.close();
});

test("BE content rejection retains the entered announcement for correction", async ({
  page,
}) => {
  await signIn(page, process.env.SEED_ADMIN_EMAIL!, process.env.SEED_ADMIN_PASSWORD!);
  await page.goto("/studio/thong-bao");
  await page.getByRole("button", { name: "Thêm thông báo", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tiêu đề", { exact: false }).fill("Chứng chỉ kiểm thử");
  await dialog.getByLabel("Nội dung", { exact: false }).fill("Nội dung cần sửa.");
  await dialog.getByRole("button", { name: "Lưu thông báo", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel("Tiêu đề", { exact: false })).toHaveValue(
    "Chứng chỉ kiểm thử",
  );
  await dialog.getByLabel("Tiêu đề", { exact: false }).fill(`Thông báo ${uid()}`);
  await dialog.getByRole("button", { name: "Lưu thông báo", exact: true }).click();
  await expect(dialog).toBeHidden();
});
