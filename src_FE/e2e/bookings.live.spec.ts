import {
  test,
  expect,
  fixture,
  signIn,
  call,
  API,
  ledger,
  databaseFixture,
  uid,
} from "./helpers/live";
import type {
  BookingResult,
  MyScheduleItem,
  ClassSessionDetailResponse,
  StudentPackageResponse,
  PackageTypeResponse,
} from "../app/lib/api/schema";

test("change to a newly full class rolls back; retry changes both bookings without another debit", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  const rival = await fixture(request);
  const target = await data.createClass(72, 1);
  const source = await call<BookingResult>(
    request,
    "POST",
    "/bookings",
    { class_session_id: data.session.id },
    data.studentToken,
  );
  await signIn(page, data.studentAccount.email);
  await page.goto("/hv/lich-cua-toi");
  await page.getByRole("button", { name: "Đổi buổi", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Đổi sang buổi/).selectOption(String(target.id));
  const occupied = await call<BookingResult>(
    request,
    "POST",
    "/bookings",
    { class_session_id: target.id },
    rival.studentToken,
  );
  await dialog.getByRole("button", { name: "Đổi buổi", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  expect((await ledger(request, data.token, data.sold.id)).closing_balance).toBe(9);
  const original = await call<MyScheduleItem[]>(
    request,
    "GET",
    "/my-schedule?include_cancelled=true",
    undefined,
    data.studentToken,
  );
  expect(
    original.find((item) => item.booking_id === source.booking.id)!.booking_status,
  ).toBe("BOOKED");
  await call(
    request,
    "POST",
    `/bookings/${occupied.booking.id}/cancel`,
    {},
    rival.studentToken,
  );
  await dialog.getByRole("button", { name: "Đổi buổi", exact: true }).click();
  await expect(dialog).toBeHidden();
  const after = await call<MyScheduleItem[]>(
    request,
    "GET",
    "/my-schedule?include_cancelled=true",
    undefined,
    data.studentToken,
  );
  expect(after.find((item) => item.class_session_id === target.id)!.booking_status).toBe(
    "BOOKED",
  );
  expect(after.find((item) => item.booking_id === source.booking.id)!.booking_status).toBe(
    "CANCELLED_INTIME",
  );
  expect((await ledger(request, data.token, data.sold.id)).closing_balance).toBe(9);
  expect(
    (
      await call<ClassSessionDetailResponse>(
        request,
        "GET",
        `/classes/${data.session.id}`,
        undefined,
        data.token,
      )
    ).booked_count,
  ).toBe(0);
});

test("two student UI sessions race for last seat; one debit and one refusal; duplicate changes no credits", async ({
  page,
  request,
  observePage,
}) => {
  const data = await fixture(request);
  const rival = await fixture(request);
  const target = await data.createClass(72, 1);
  // Each tab is a separate browser context so its localStorage belongs to one student.
  const otherContext = await page
    .context()
    .browser()!
    .newContext({ baseURL: "http://localhost:4173" });
  const other = await otherContext.newPage();
  observePage(other);
  try {
    await signIn(page, data.studentAccount.email);
    await signIn(other, rival.studentAccount.email);
    for (const tab of [page, other]) {
      await tab.goto(`/hv/lop-hoc/${target.id}`);
      await tab.getByRole("button", { name: "Đặt lớp này", exact: true }).click();
    }
    const responses = [
      page.waitForResponse(
        (response) =>
          response.url() === `${API}/bookings` && response.request().method() === "POST",
      ),
      other.waitForResponse(
        (response) =>
          response.url() === `${API}/bookings` && response.request().method() === "POST",
      ),
    ];
    await Promise.all(
      [page, other].map((tab) =>
        tab
          .getByRole("dialog")
          .getByRole("button", { name: "Xác nhận đặt", exact: true })
          .click(),
      ),
    );
    const writes = await Promise.all(responses);
    expect(writes.map((response) => response.status()).sort()).toEqual([201, 409]);
    expect(
      (
        await call<ClassSessionDetailResponse>(
          request,
          "GET",
          `/classes/${target.id}`,
          undefined,
          data.token,
        )
      ).booked_count,
    ).toBe(1);
    const balances = await Promise.all([
      ledger(request, data.token, data.sold.id),
      ledger(request, data.token, rival.sold.id),
    ]);
    expect(balances.map((item) => item.closing_balance).sort((a, b) => a - b)).toEqual([
      9, 10,
    ]);
    const winner = writes[0]!.status() === 201 ? data : rival;
    expect(
      (
        await request.post(`${API}/bookings`, {
          headers: { Authorization: `Bearer ${winner.studentToken}` },
          data: { class_session_id: target.id },
        })
      ).status(),
    ).toBe(409);
    expect((await ledger(request, data.token, winner.sold.id)).closing_balance).toBe(9);
  } finally {
    await otherContext.close();
  }
});

test("PRIVATE cancellation before one-hour deadline refunds once; after it UI forbids cancellation", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  const type = await call<PackageTypeResponse>(
    request,
    "POST",
    "/package-types",
    {
      name: `Gói riêng E2E ${uid()}`,
      price: "2000000.00",
      credits: 5,
      duration_days: 30,
      class_type: "PRIVATE",
    },
    data.token,
  );
  const sold = await call<StudentPackageResponse>(
    request,
    "POST",
    "/packages/sell",
    { student_id: data.student.id, package_type_id: type.id },
    data.token,
  );
  const session = await data.createClass(2, 1, "PRIVATE");
  await signIn(page, data.studentAccount.email);
  await page.goto(`/hv/lop-hoc/${session.id}`);
  await page.getByRole("button", { name: "Đặt lớp này", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận đặt", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect((await ledger(request, data.token, sold.id)).closing_balance).toBe(4);
  await page.goto("/hv/lich-cua-toi");
  await page.getByRole("button", { name: "Hủy buổi", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hủy buổi", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect((await ledger(request, data.token, sold.id)).closing_balance).toBe(5);
  const later = await data.createClass(4, 1, "PRIVATE");
  await call(
    request,
    "POST",
    "/bookings",
    { class_session_id: later.id },
    data.studentToken,
  );
  databaseFixture("closed", later.id);
  await page.reload();
  await expect(page.getByText(data.trainer.full_name, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hủy buổi", exact: true })).toHaveCount(0);
  expect((await ledger(request, data.token, sold.id)).closing_balance).toBe(4);
});

test("no matching package or insufficient credits cannot book; no debit is recorded", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  const privateClass = await data.createClass(72, 1, "PRIVATE");
  await signIn(page, data.studentAccount.email);
  await page.goto(`/hv/lop-hoc/${privateClass.id}`);
  await expect(
    page.getByText("Gói tập hiện tại của bạn chưa dùng được cho buổi này."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Đặt lớp này", exact: true }),
  ).toBeDisabled();
  await call(
    request,
    "POST",
    `/packages/${data.sold.id}/adjust`,
    { delta: -10, reason: "Chuẩn bị gói hết buổi E2E" },
    data.token,
  );
  await page.goto(`/hv/lop-hoc/${data.session.id}`);
  await expect(
    page.getByText("Gói tập hiện tại của bạn chưa dùng được cho buổi này."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Đặt lớp này", exact: true }),
  ).toBeDisabled();
  expect((await ledger(request, data.token, data.sold.id)).closing_balance).toBe(0);
});

test("expired package with remaining credits is ineligible and retains its balance", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  databaseFixture("expired-package", data.sold.id);
  await signIn(page, data.studentAccount.email);
  await page.goto(`/hv/lop-hoc/${data.session.id}`);
  await expect(
    page.getByText("Gói tập hiện tại của bạn chưa dùng được cho buổi này."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Đặt lớp này", exact: true }),
  ).toBeDisabled();
  expect((await ledger(request, data.token, data.sold.id)).closing_balance).toBe(10);
});
