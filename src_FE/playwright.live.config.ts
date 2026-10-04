import { defineConfig, devices } from "@playwright/test";

if (
  process.env.RUN_LIVE_API !== "true" ||
  !process.env.LIVE_API_URL ||
  !process.env.SEED_ADMIN_EMAIL ||
  !process.env.SEED_ADMIN_PASSWORD
) {
  throw new Error(
    "Live E2E requires RUN_LIVE_API=true, LIVE_API_URL and disposable admin credentials. See docs/LOCAL_BACKEND.md.",
  );
}

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
export default defineConfig({
  testDir: "./e2e",
  testMatch: /\.live\.spec\.ts$/,
  globalSetup: "./e2e/helpers/live-preflight.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/live", open: "never" }],
    ["json", { outputFile: "test-results/live-results.json" }],
  ],
  use: {
    baseURL: `http://localhost:${port}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "live",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "live-mobile",
      testMatch:
        /(?:production-api|public-auth|trainer|bookings|photos|auth-session)\.live\.spec\.ts$/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `node scripts/serve-dist.mjs ${port}`,
    port,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
