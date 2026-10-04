import { test, expect, fixture, signIn, call, uid, ledger } from "./helpers/live";
import type {
  PaymentResponse,
  PackageTypeResponse,
  StudentPackageResponse,
  RevenueSummaryResponse,
} from "../app/lib/api/schema";

test("ADMIN creates a catalogue offer, STAFF sells and renews it, ledger updates", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  const name = `Gói E2E ${uid()}`;
  await signIn(page, process.env.SEED_ADMIN_EMAIL!, process.env.SEED_ADMIN_PASSWORD!);
  await page.goto("/studio/goi-tap");
  await page.getByRole("button", { name: "Thêm gói", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Tên gói/).fill(name);
  await dialog.getByLabel(/Số buổi/).fill("5");
  await dialog.getByLabel(/Thời hạn/).fill("30");
  await dialog.getByLabel("Giá", { exact: true }).fill("500000");
  await dialog.getByRole("button", { name: "Thêm gói", exact: true }).click();
  await expect(dialog).toBeHidden();
  const type = (
    await call<PackageTypeResponse[]>(
      request,
      "GET",
      "/package-types",
      undefined,
      data.token,
    )
  ).find((item) => item.name === name)!;
  expect(type.price).toBe("500000.00");
  await page.evaluate(() => localStorage.clear());
  await signIn(page, data.staffAccount.email);
  await page.goto(`/studio/hoc-vien/${data.student.id}`);
  await page.getByRole("button", { name: "Bán gói", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Gói tập/).selectOption(String(type.id));
  await dialog.getByRole("button", { name: "Bán gói", exact: true }).click();
  await expect(dialog).toBeHidden();
  const sold = (
    await call<StudentPackageResponse[]>(
      request,
      "GET",
      `/packages?student_id=${data.student.id}`,
      undefined,
      data.token,
    )
  ).find((item) => item.package_type_id === type.id)!;
  expect((await ledger(request, data.token, sold.id)).closing_balance).toBe(5);
  await page.getByRole("button", { name: "Gia hạn gói", exact: true }).first().click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Cộng thêm buổi/).fill("2");
  await dialog.getByRole("button", { name: "Gia hạn", exact: true }).click();
  await expect(dialog).toBeHidden();
  const packages = await call<StudentPackageResponse[]>(
    request,
    "GET",
    `/packages?student_id=${data.student.id}`,
    undefined,
    data.token,
  );
  expect(packages.reduce((sum, item) => sum + item.balance_cached, 0)).toBe(17);
  await page.goto("/studio/goi-tap");
  await page
    .getByRole("article", { name, exact: true })
    .getByRole("button", { name: /Thao tác/ })
    .click();
  await page.getByRole("button", { name: "Sửa gói", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Giá", { exact: true }).fill("600000");
  await dialog.getByRole("button", { name: "Lưu gói", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(
    (
      await call<StudentPackageResponse[]>(
        request,
        "GET",
        `/packages?student_id=${data.student.id}`,
        undefined,
        data.token,
      )
    ).find((item) => item.id === sold.id)!.price_snapshot,
  ).toBe("500000.00");
  expect(
    (
      await call<PackageTypeResponse[]>(
        request,
        "GET",
        "/package-types",
        undefined,
        data.token,
      )
    ).find((item) => item.id === type.id)!.price,
  ).toBe("600000.00");
});

test("receipt transitions PENDING to CONFIRMED to VOID; revenue and credits reconcile", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  const note = `Khoản thu E2E ${uid()}`;
  await signIn(page, data.staffAccount.email);
  await page.goto("/studio/thanh-toan");
  await page.getByRole("button", { name: "Ghi nhận khoản thu", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Học viên/).selectOption(String(data.student.id));
  await expect(dialog.getByLabel(/Gói tập/)).toBeEnabled();
  await dialog.getByLabel(/Gói tập/).selectOption(String(data.sold.id));
  await dialog.getByLabel(/Số tiền/).fill("1000000");
  await dialog.getByLabel(/Ghi chú|Nội dung/).fill(note);
  await dialog.getByRole("button", { name: "Ghi nhận", exact: true }).click();
  await expect(dialog).toBeHidden();
  const receipt = (
    await call<PaymentResponse[]>(
      request,
      "GET",
      "/payments?limit=200",
      undefined,
      data.token,
    )
  ).find((item) => item.note === note)!;
  expect(receipt.status).toBe("PENDING");
  const before = await call<RevenueSummaryResponse>(
    request,
    "GET",
    "/reports/revenue",
    undefined,
    data.token,
  );
  const pending = page.getByRole("listitem").filter({ hasText: note });
  await pending.getByRole("button", { name: "Xác nhận đã nhận tiền", exact: true }).click();
  await expect(pending).toBeHidden();
  const row = page.getByRole("row").filter({ hasText: note });
  await expect(row.getByText("Đã xác nhận", { exact: true })).toBeVisible();
  const confirmed = await call<PaymentResponse>(
    request,
    "GET",
    `/payments/${receipt.id}`,
    undefined,
    data.token,
  );
  expect(confirmed.amount).toBe("1000000.00");
  expect(confirmed.status).toBe("CONFIRMED");
  await row.getByRole("button", { name: /Thao tác/ }).click();
  await page.getByRole("button", { name: "Xem phiếu", exact: true }).click();
  await expect(page.getByRole("dialog").getByText(note, { exact: true })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Đóng", exact: true }).click();
  await row.getByRole("button", { name: /Thao tác/ }).click();
  await page.getByRole("button", { name: "Hủy phiếu", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Lý do hủy/).fill("Ghi nhận nhầm gói kiểm thử");
  await dialog.getByRole("button", { name: "Hủy phiếu này", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(
    (
      await call<PaymentResponse>(
        request,
        "GET",
        `/payments/${receipt.id}`,
        undefined,
        data.token,
      )
    ).status,
  ).toBe("VOID");
  expect((await ledger(request, data.token, data.sold.id)).closing_balance).toBe(0);
  expect(await call(request, "GET", "/reports/revenue", undefined, data.token)).toEqual(
    before,
  );
});

test("ADMIN adjusts credits with a reason and STAFF cannot use that action", async ({
  page,
  request,
}) => {
  const data = await fixture(request);
  await signIn(page, process.env.SEED_ADMIN_EMAIL!, process.env.SEED_ADMIN_PASSWORD!);
  await page.goto(`/studio/so-buoi?goi=${data.sold.id}&hv=${data.student.id}`);
  await page.getByRole("button", { name: "Điều chỉnh buổi", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Cộng hay trừ/).selectOption("add");
  await dialog.getByLabel(/Số buổi/).fill("2");
  await dialog.getByLabel(/Lý do/).fill("Bù buổi bảo trì thiết bị");
  await dialog.getByRole("button", { name: "Ghi bút toán", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect((await ledger(request, data.token, data.sold.id)).closing_balance).toBe(12);
  await page.evaluate(() => localStorage.clear());
  await signIn(page, data.staffAccount.email);
  await page.goto(`/studio/so-buoi?goi=${data.sold.id}&hv=${data.student.id}`);
  await expect(page.getByRole("heading", { name: "Sổ buổi", exact: true })).toBeVisible();
  await expect(page.locator(".animate-skeleton")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Điều chỉnh buổi", exact: true }),
  ).toHaveCount(0);
});
