import { expect, test } from "@playwright/test";

test("login loading feedback keeps the button box fixed", async ({ page }) => {
  let releaseRequest = () => {};
  let signalRequest = () => {};
  const requestStarted = new Promise<void>((resolve) => {
    signalRequest = resolve;
  });
  const requestGate = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });

  await page.route("**/api/auth/login", async (route) => {
    signalRequest();
    await requestGate;
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Invalid credentials" }),
    });
  });

  await page.goto("/dang-nhap");
  await page.locator('input[type="email"]').fill("qa@example.com");
  await page.locator('input[type="password"]').fill("not-a-real-password");

  const idleButton = page.getByRole("button", { name: "Đăng nhập", exact: true });
  const idleBox = await idleButton.boundingBox();
  expect(idleBox).not.toBeNull();

  await idleButton.click();
  await requestStarted;

  const pendingButton = page.getByRole("button", { name: "Đang đăng nhập…" });
  await expect(pendingButton).toBeDisabled();
  const pendingBox = await pendingButton.boundingBox();
  expect(pendingBox).not.toBeNull();

  expect(pendingBox?.x).toBeCloseTo(idleBox?.x ?? 0, 1);
  expect(pendingBox?.y).toBeCloseTo(idleBox?.y ?? 0, 1);
  expect(pendingBox?.width).toBeCloseTo(idleBox?.width ?? 0, 1);
  expect(pendingBox?.height).toBeCloseTo(idleBox?.height ?? 0, 1);

  releaseRequest();
});
