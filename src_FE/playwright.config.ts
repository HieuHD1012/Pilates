import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
/** The dev server, where MSW is live. See the `app` project below. */
const DEV_PORT = 5199;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /\.app\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      // Chromium-based on purpose: `npm run e2e:install` provisions chromium
      // only, so CI and local runs use the same engine. Adding a WebKit project
      // means adding webkit to that install step.
      name: "mobile",
      testIgnore: /\.app\.spec\.ts$/,
      use: { ...devices["Pixel 7"] },
    },
    {
      /**
       * The application shell, which needs data. `app/entry.client.tsx` starts
       * MSW only in development, so the production artifact has no backend at all
       * and every staff and student screen is untestable against it. This project
       * points at the dev server instead — the one place those screens can be
       * exercised until a real API exists.
       */
      name: "app",
      testMatch: /\.app\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        baseURL: `http://localhost:${DEV_PORT}`,
      },
    },
  ],
  /**
   * E2E runs against the real production artifact set, served the way the CDN
   * serves it (SPA fallback at __spa-fallback.html). See scripts/serve-dist.mjs.
   */
  webServer: [
    {
      command: `node scripts/serve-dist.mjs ${PORT}`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --port ${DEV_PORT} --strictPort`,
      port: DEV_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
