import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  test as baseTest,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import type {
  AccountResponse,
  ClassSessionResponse,
  PackageTypeResponse,
  StudentPackageResponse,
  StudentResponse,
  TokenPair,
  TrainerResponse,
  PackageLedgerResponse,
} from "../../app/lib/api/schema";

export const API = process.env.LIVE_API_URL!;
export const PASSWORD = "ci-disposable-password-2026";
export const uid = () => randomUUID().replaceAll("-", "").slice(0, 16);
export function studioDay(offset = 0) {
  const date = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function phone() {
  return `09${BigInt(`0x${uid()}`).toString().slice(-8)}`;
}

export async function call<T>(
  request: APIRequestContext,
  method: string,
  path: string,
  data?: unknown,
  token?: string,
): Promise<T> {
  const response = await request.fetch(`${API}${path}`, {
    method,
    data,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  expect(response.ok(), `${method} ${path} returned ${response.status()}`).toBe(true);
  return response.status() === 204 ? (undefined as T) : response.json();
}
export async function adminToken(request: APIRequestContext) {
  return (
    await call<TokenPair>(request, "POST", "/auth/login", {
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
    })
  ).access_token;
}
export async function account(
  request: APIRequestContext,
  token: string,
  role: "STAFF" | "ADMIN" | "TRAINER" | "STUDENT",
  profile: { student_id?: number } = {},
) {
  const email = `${role.toLowerCase()}-${uid()}@example.com`;
  const row = await call<AccountResponse>(
    request,
    "POST",
    "/accounts",
    { email, password: PASSWORD, full_name: `E2E ${role}`, role, ...profile },
    token,
  );
  return { ...row, email, password: PASSWORD };
}
export async function signIn(
  page: Page,
  email: string,
  password = PASSWORD,
  next?: string,
) {
  await page.goto(`/dang-nhap${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel(/Email/).fill(email);
  await page.getByLabel(/Mật khẩu/).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/(?:studio|hv|hlv)(?:\/|$)/);
}
export async function fixture(request: APIRequestContext) {
  const token = await adminToken(request);
  const student = await call<StudentResponse>(
    request,
    "POST",
    "/students",
    { full_name: `E2E học viên ${uid()}`, phone: phone() },
    token,
  );
  const trainer = await call<TrainerResponse>(
    request,
    "POST",
    "/trainers",
    { full_name: `E2E HLV ${uid()}` },
    token,
  );
  const studentAccount = await account(request, token, "STUDENT", {
    student_id: student.id,
  });
  const trainerAccount = await account(request, token, "TRAINER");
  await call(
    request,
    "PATCH",
    `/trainers/${trainer.id}`,
    { user_id: trainerAccount.id },
    token,
  );
  const staffAccount = await account(request, token, "STAFF");
  const type = await call<PackageTypeResponse>(
    request,
    "POST",
    "/package-types",
    {
      name: `Gói E2E ${uid()}`,
      price: "1000000.00",
      credits: 10,
      duration_days: 90,
      class_type: "GROUP",
    },
    token,
  );
  const sold = await call<StudentPackageResponse>(
    request,
    "POST",
    "/packages/sell",
    { student_id: student.id, package_type_id: type.id },
    token,
  );
  const createClass = async (hours = 48, capacity = 3, classType = "GROUP") => {
    const starts = new Date(Date.now() + hours * 3600000);
    return call<ClassSessionResponse>(
      request,
      "POST",
      "/classes",
      {
        starts_at: starts.toISOString(),
        ends_at: new Date(starts.getTime() + 50 * 60000).toISOString(),
        trainer_id: trainer.id,
        class_type: classType,
        capacity,
      },
      token,
    );
  };
  const session = await createClass();
  const studentToken = (
    await call<TokenPair>(request, "POST", "/auth/login", {
      email: studentAccount.email,
      password: PASSWORD,
    })
  ).access_token;
  return {
    token,
    student,
    trainer,
    studentAccount,
    trainerAccount,
    staffAccount,
    type,
    sold,
    session,
    studentToken,
    createClass,
  };
}
export async function ledger(request: APIRequestContext, token: string, packageId: number) {
  return call<PackageLedgerResponse>(
    request,
    "GET",
    `/packages/${packageId}/ledger`,
    undefined,
    token,
  );
}
export function databaseFixture(
  action: "ended" | "closed" | "expire-reset" | "expired-package",
  id: number,
) {
  const python =
    process.env.LIVE_PYTHON ??
    (process.platform === "win32"
      ? "../src_BE/.venv/Scripts/python.exe"
      : "../src_BE/.venv/bin/python");
  const result = spawnSync(python, ["-m", "scripts.live_e2e", action, "--id", String(id)], {
    cwd: "../src_BE",
    encoding: "utf8",
    env: process.env,
  });
  expect(result.status, result.stderr || result.stdout).toBe(0);
}

export const test = baseTest.extend<{ observePage: (page: Page) => void }>({
  observePage: [
    async ({ page }, use, info) => {
      const errors: string[] = [];
      const consoleErrors: { text: string; path: string }[] = [];
      const evidence: { method: string; path: string; status: number }[] = [];
      const watch = (tab: Page) => {
        tab.on("pageerror", (error) =>
          errors.push(`${new URL(tab.url()).pathname}: ${error.message}`),
        );
        tab.on("console", (message) => {
          if (message.type() !== "error") return;
          const url = message.location().url;
          consoleErrors.push({
            text: message.text(),
            path: url ? new URL(url).pathname : "",
          });
        });
        tab.on("response", (response) => {
          if (!response.url().startsWith(API)) return;
          const path = new URL(response.url()).pathname;
          evidence.push({
            method: response.request().method(),
            path,
            status: response.status(),
          });
          if (response.status() >= 500) errors.push(`${response.status()} ${path}`);
        });
      };
      watch(page);
      await use(watch);
      for (const entry of consoleErrors) {
        // Chromium logs tested HTTP rejections as resource errors. Application
        // exceptions and CORS failures must still fail, including negative cases.
        const testedRejection =
          /Failed to load resource/.test(entry.text) &&
          evidence.some(
            (response) =>
              response.path === entry.path &&
              response.status >= 400 &&
              response.status < 500,
          );
        const testedOffline =
          /Failed to load resource.*ERR_INTERNET_DISCONNECTED/.test(entry.text) &&
          info.annotations.some((item) => item.type === "expected-network-failure");
        if (!testedRejection && !testedOffline) errors.push(`${entry.path}: ${entry.text}`);
      }
      await info.attach("mapping-evidence", {
        body: JSON.stringify(evidence),
        contentType: "application/json",
      });
      expect(errors).toEqual([]);
      expect(
        await page.evaluate(async () =>
          navigator.serviceWorker
            ? (await navigator.serviceWorker.getRegistrations()).length
            : 0,
        ),
      ).toBe(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    },
    { auto: true },
  ],
});
export { expect };
