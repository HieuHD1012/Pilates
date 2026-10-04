import { test, expect, fixture, API } from "./helpers/live";

test("real login rate limit preserves credentials and permits retry after server backoff", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const data = await fixture(request);
  await page.goto("/dang-nhap");
  await page.getByLabel(/Email/).fill(data.studentAccount.email);
  await page.getByLabel(/Mật khẩu/).fill("incorrect-password");
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = page.waitForResponse(
      (response) => response.url() === `${API}/auth/login`,
    );
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    expect((await result).status()).toBe(401);
  }
  const blocked = page.waitForResponse(
    (response) => response.url() === `${API}/auth/login`,
  );
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const response = await blocked;
  expect(response.status()).toBe(429);
  expect(Number(response.headers()["retry-after"])).toBeGreaterThan(0);
  await expect(page.getByRole("alert")).toContainText("Đã thử quá nhiều lần");
  await expect(page.getByLabel(/Email/)).toHaveValue(data.studentAccount.email);
  await page.getByLabel(/Mật khẩu/).fill(data.studentAccount.password);
  await expect
    .poll(
      async () => {
        const result = page.waitForResponse(
          (response) => response.url() === `${API}/auth/login`,
        );
        await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
        return (await result).status();
      },
      { timeout: 45_000, intervals: [2000] },
    )
    .toBe(200);
  await expect(page).toHaveURL(/\/hv\/lop-hoc$/);
});
