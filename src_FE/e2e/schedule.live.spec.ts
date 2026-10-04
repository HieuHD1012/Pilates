import {
  test,
  expect,
  fixture,
  signIn,
  call,
  databaseFixture,
  ledger,
  API,
  studioDay,
} from "./helpers/live";
import type {
  ClassSessionResponse,
  BookingResult,
  RecurrencePreviewResponse,
  RecurrenceCreateResponse,
  TrainerResponse,
} from "../app/lib/api/schema";

test("STAFF creates class in studio timezone; duplicate trainer slot is refused without dropping form", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  await signIn(page, data.staffAccount.email);
  await page.goto("/studio/lich");
  const create = async () => {
    await page.getByRole("button", { name: "Thêm lớp", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Huấn luyện viên/).selectOption(String(data.trainer.id));
    await dialog.getByLabel(/^Ngày/).fill(studioDay(1));
    await dialog.getByLabel(/Giờ bắt đầu/).fill("22:00");
    await dialog.getByLabel(/Sức chứa/).fill("3");
    return dialog;
  };
  let dialog = await create();
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/classes") && r.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Thêm lớp", exact: true }).click();
  const created = await response;
  expect(created.status()).toBe(201);
  expect(created.request().postDataJSON().starts_at).toBe(`${studioDay(1)}T22:00:00+07:00`);
  const row = (await created.json()) as ClassSessionResponse;
  await expect(dialog).toBeHidden();
  dialog = await create();
  await dialog.getByRole("button", { name: "Thêm lớp", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel(/Giờ bắt đầu/)).toHaveValue("22:00");
  expect(
    (
      await call<ClassSessionResponse>(
        request,
        "GET",
        `/classes/${row.id}`,
        undefined,
        data.token,
      )
    ).trainer_id,
  ).toBe(data.trainer.id);
});

test("STAFF previews and creates recurrence; trainer reassignment updates detail and access", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  // This trainer has no pre-existing class. The fixture's default session is
  // two days from now and could overlap 23:00 when this suite runs at night.
  const recurrenceTrainer = await call<TrainerResponse>(
    request,
    "POST",
    "/trainers",
    {
      full_name: `E2E HLV định kỳ ${data.trainer.id}`,
    },
    data.token,
  );
  await signIn(page, data.staffAccount.email);
  await page.goto("/studio/lich");
  await page.getByRole("button", { name: "Lớp định kỳ", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Huấn luyện viên/).selectOption(String(recurrenceTrainer.id));
  await dialog.getByLabel("Ngày", { exact: false }).first().fill(studioDay(1));
  await dialog.getByLabel(/Giờ bắt đầu/).fill("23:00");
  await dialog.getByLabel(/Sức chứa/).fill("3");
  await dialog.getByLabel("Lặp đến ngày", { exact: false }).fill(studioDay(7));
  for (const checkbox of await dialog.getByRole("checkbox").all()) {
    if (!(await checkbox.isChecked())) {
      await checkbox.focus();
      await checkbox.press("Space");
      await expect(checkbox).toBeChecked();
    }
  }
  const previewResponse = page.waitForResponse((response) =>
    response.url().endsWith("/classes/recurrence/preview"),
  );
  await dialog.getByRole("button", { name: "Xem trước", exact: true }).click();
  const preview = (await (await previewResponse).json()) as RecurrencePreviewResponse;
  expect(preview.available_count).toBe(7);
  dialog = page.getByRole("dialog");
  const createResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/classes/recurrence") &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Tạo 7 buổi", exact: true }).click();
  const created = (await (await createResponse).json()) as RecurrenceCreateResponse;
  await expect(dialog).toBeHidden();
  expect(created.sessions).toHaveLength(7);
  const replacement = await call<TrainerResponse>(
    request,
    "POST",
    "/trainers",
    { full_name: `E2E HLV thay ${data.trainer.id}` },
    data.token,
  );
  await page.goto(`/studio/lich/${data.session.id}`);
  await page.getByRole("button", { name: "Đổi huấn luyện viên", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Huấn luyện viên/).selectOption(String(replacement.id));
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(
    (
      await call<ClassSessionResponse>(
        request,
        "GET",
        `/classes/${data.session.id}`,
        undefined,
        data.token,
      )
    ).trainer_id,
  ).toBe(replacement.id);
});

test("class cancellation refunds held booking and updates student schedule", async ({
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
  await signIn(page, data.staffAccount.email);
  await page.goto(`/studio/lich/${data.session.id}`);
  await page.getByRole("button", { name: "Hủy lớp", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Lý do hủy/).fill("Studio bảo trì thiết bị");
  await dialog.getByRole("button", { name: "Hủy lớp", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect((await ledger(request, data.token, data.sold.id)).closing_balance).toBe(10);
  expect(
    (
      await call<ClassSessionResponse>(
        request,
        "GET",
        `/classes/${data.session.id}`,
        undefined,
        data.token,
      )
    ).status,
  ).toBe("CANCELLED");
});

test("closed cancellation is disabled by BE verdict and direct rejection changes no credits", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  const result = await call<BookingResult>(
    request,
    "POST",
    "/bookings",
    { class_session_id: data.session.id },
    data.studentToken,
  );
  databaseFixture("closed", data.session.id);
  await signIn(page, data.studentAccount.email);
  await page.goto("/hv/lich-cua-toi");
  await expect(page.getByText(data.trainer.full_name, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hủy buổi", exact: true })).toHaveCount(0);
  const rejection = await request.post(`${API}/bookings/${result.booking.id}/cancel`, {
    headers: { Authorization: `Bearer ${data.studentToken}` },
    data: {},
  });
  expect(rejection.status()).toBe(409);
  expect((await ledger(request, data.token, data.sold.id)).closing_balance).toBe(9);
});
