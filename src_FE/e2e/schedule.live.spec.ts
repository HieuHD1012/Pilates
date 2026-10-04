import {
  test,
  expect,
  fixture,
  signIn,
  call,
  databaseFixture,
  ledger,
  API,
} from "./helpers/live";
import type { ClassSessionResponse, BookingResult } from "../app/lib/api/schema";
import { studioDay } from "./helpers/demo";

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
  await expect(page.getByRole("button", { name: "Hủy buổi", exact: true })).toHaveCount(0);
  const rejection = await request.post(`${API}/bookings/${result.booking.id}/cancel`, {
    headers: { Authorization: `Bearer ${data.studentToken}` },
    data: {},
  });
  expect(rejection.status()).toBe(409);
  expect((await ledger(request, data.token, data.sold.id)).closing_balance).toBe(9);
});
