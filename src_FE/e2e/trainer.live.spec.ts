import {
  test,
  expect,
  fixture,
  call,
  signIn,
  databaseFixture,
  ledger,
  API,
} from "./helpers/live";
import type { BookingResult } from "../app/lib/api/schema";

test("trainer marks and corrects attendance; student history and ledger remain consistent", async ({
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
  databaseFixture("ended", data.session.id);
  await signIn(page, data.trainerAccount.email);
  await page.goto(`/hlv/lop/${data.session.id}`);
  let write = page.waitForResponse(
    (response) =>
      response.url().startsWith(API) &&
      response.url().endsWith("/attendance") &&
      response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Đã đến lớp", exact: true }).click();
  expect((await write).status()).toBe(200);
  await expect(page.getByText("Đã đến lớp", { exact: true }).first()).toBeVisible();
  expect((await ledger(request, data.token, data.sold.id)).closing_balance).toBe(9);
  write = page.waitForResponse(
    (response) =>
      response.url().startsWith(API) &&
      response.url().endsWith("/attendance") &&
      response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Vắng mặt", exact: true }).click();
  expect((await write).status()).toBe(200);
  await expect(page.getByText("Vắng mặt", { exact: true }).first()).toBeVisible();
  expect((await ledger(request, data.token, data.sold.id)).closing_balance).toBe(9);
  await page.evaluate(() => localStorage.clear());
  await signIn(page, data.studentAccount.email);
  await page.goto("/hv/lich-su");
  await expect(page.getByText(/Vắng/).first()).toBeVisible();
});
