import { spawnSync } from "node:child_process";

if (process.argv.length > 2)
  throw new Error(
    "The live gate runs the complete suite; filtered diagnostic runs must use Playwright directly.",
  );

for (const key of [
  "LIVE_API_URL",
  "DATABASE_URL",
  "SEED_ADMIN_EMAIL",
  "SEED_ADMIN_PASSWORD",
  "JWT_SECRET",
]) {
  if (!process.env[key])
    throw new Error(`Missing ${key}; run the isolated live API setup first.`);
}
if (
  process.env.ENVIRONMENT !== "test" ||
  !process.env.DATABASE_URL.endsWith("/pilates_fe_test")
)
  throw new Error("Live E2E only runs on ENVIRONMENT=test /pilates_fe_test.");
const env = {
  ...process.env,
  RUN_LIVE_API: "true",
  VITE_ENABLE_MSW: "false",
  VITE_API_BASE_URL: process.env.LIVE_API_URL,
};
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Use npm run e2e:live");
const python =
  process.env.LIVE_PYTHON ??
  (process.platform === "win32"
    ? "../src_BE/.venv/Scripts/python.exe"
    : "../src_BE/.venv/bin/python");
const openapi = spawnSync(
  python,
  ["-m", "scripts.export_openapi", "../src_FE/visual-qa/live/openapi.json"],
  {
    stdio: "inherit",
    env,
    cwd: "../src_BE",
  },
);
if (openapi.status !== 0) process.exit(1);
const contract = spawnSync(
  process.execPath,
  ["scripts/check-api-contract.mjs", "visual-qa/live/openapi.json"],
  { stdio: "inherit", env },
);
if (contract.status !== 0) process.exit(1);
const build = spawnSync(process.execPath, [npm, "run", "build"], { stdio: "inherit", env });
if (build.status !== 0) process.exit(build.status ?? 1);
const result = spawnSync(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", "--config=playwright.live.config.ts"],
  { stdio: "inherit", env },
);
const coverage = spawnSync(
  process.execPath,
  [
    "scripts/check-live-coverage.mjs",
    "visual-qa/live/openapi.json",
    "test-results/live-results.json",
  ],
  { stdio: "inherit", env },
);
const redact = spawnSync(
  python,
  ["../scripts/redact_live_artifacts.py", "test-results", "playwright-report"],
  { stdio: "inherit", env },
);
process.exit(result.status === 0 && coverage.status === 0 && redact.status === 0 ? 0 : 1);
