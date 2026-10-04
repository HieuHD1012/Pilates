import { test, expect, fixture, signIn, call, API, ledger } from "./helpers/live";
import type {
  BookingResult,
  ProgressPhotoResponse,
  TrainerResponse,
  PublicTrainer,
} from "../app/lib/api/schema";

const image = {
  name: "progress.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAO0lEQVR4nO3RQREAMAjEwKP6K6IiEFgJ4cMvK+CYCdXvZtNZXY8HBvwBMhEyETIRMhEyETIRMhEyUcgHSfACIJF+Q0IAAAAASUVORK5CYII=",
    "base64",
  ),
};

test("student uploads a private photo; assigned trainer reads it; ADMIN deletes; STAFF and unrelated student are refused", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  await call<BookingResult>(
    request,
    "POST",
    "/bookings",
    { class_session_id: data.session.id },
    data.studentToken,
  );
  await signIn(page, data.studentAccount.email);
  await page.goto("/hv/tai-khoan");
  await page.getByLabel("Ảnh tiến trình mới", { exact: false }).setInputFiles(image);
  await page.getByRole("button", { name: "Tải ảnh tiến trình", exact: true }).click();
  const picture = page.getByRole("img", { name: "Ảnh tiến trình học viên", exact: true });
  await expect(picture).toBeVisible();
  await expect
    .poll(() => picture.evaluate((node) => (node as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  const photos = await call<ProgressPhotoResponse[]>(
    request,
    "GET",
    `/students/${data.student.id}/progress-photos`,
    undefined,
    data.studentToken,
  );
  expect(photos).toHaveLength(1);
  const path = `/students/${data.student.id}/progress-photos/${photos[0]!.id}/file`;
  const staffToken = (
    await call<{ access_token: string }>(request, "POST", "/auth/login", {
      email: data.staffAccount.email,
      password: data.staffAccount.password,
    })
  ).access_token;
  expect(
    (
      await request.get(`${API}${path}`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      })
    ).status(),
  ).toBe(403);
  const stranger = await fixture(request);
  expect(
    (
      await request.get(`${API}${path}`, {
        headers: { Authorization: `Bearer ${stranger.studentToken}` },
      })
    ).status(),
  ).toBe(403);
  await page.evaluate(() => localStorage.clear());
  await signIn(page, data.trainerAccount.email);
  await page.goto(`/hlv/lop/${data.session.id}`);
  await page.getByRole("link", { name: data.student.full_name, exact: true }).click();
  await expect(picture).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Xóa ảnh tiến trình", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => localStorage.clear());
  await signIn(page, process.env.SEED_ADMIN_EMAIL!, process.env.SEED_ADMIN_PASSWORD!);
  await page.goto(`/studio/hoc-vien/${data.student.id}`);
  await page.getByRole("tab", { name: "Ảnh tiến trình", exact: true }).click();
  await page.getByRole("button", { name: "Xóa ảnh tiến trình", exact: true }).click();
  const removed = page.waitForResponse(
    (response) =>
      response.url() ===
        `${API}/students/${data.student.id}/progress-photos/${photos[0]!.id}` &&
      response.request().method() === "DELETE",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xóa ảnh", exact: true })
    .click();
  expect((await removed).status()).toBe(204);
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(picture).toHaveCount(0);
  expect(
    (
      await request.get(`${API}${path}`, {
        headers: { Authorization: `Bearer ${data.token}` },
      })
    ).status(),
  ).toBe(404);
  expect((await ledger(request, data.token, data.sold.id)).closing_balance).toBe(9);
});

test("trainer uploads portrait, updates own biography; published directory serves that real image", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  await call<TrainerResponse>(
    request,
    "PATCH",
    `/trainers/${data.trainer.id}`,
    { is_public: true },
    data.token,
  );
  await signIn(page, data.trainerAccount.email);
  await page.goto("/hlv/ho-so");
  const bio = `E2E hướng dẫn kiểm soát chuyển động ${data.trainer.id}`;
  await page.getByLabel("Giới thiệu", { exact: true }).fill(bio);
  await page.getByLabel("Chuyên môn", { exact: true }).fill("Reformer");
  await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  await expect(page.getByText("Đã lưu hồ sơ.", { exact: true })).toBeAttached();
  await page.getByLabel("Ảnh huấn luyện viên", { exact: false }).setInputFiles(image);
  await page.getByRole("button", { name: "Lưu ảnh huấn luyện viên", exact: true }).click();
  await expect(
    page.getByText("Đã lưu ảnh huấn luyện viên.", { exact: true }),
  ).toBeAttached();
  const directory = await call<PublicTrainer[]>(request, "GET", "/public/trainers");
  const trainer = directory.find((item) => item.full_name === data.trainer.full_name)!;
  expect(trainer.bio).toBe(bio);
  expect(trainer.photo_key).toBeTruthy();
  const photo = await request.get(`${API}/public/trainer-photos/${trainer.photo_key}`);
  expect(photo.ok()).toBe(true);
  expect(photo.headers()["content-type"]).toMatch(/^image\//);
  await page.goto("/huan-luyen-vien");
  await expect(page.getByText(bio, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("img", { name: `Chân dung ${data.trainer.full_name}`, exact: true }),
  ).toBeVisible();
});
