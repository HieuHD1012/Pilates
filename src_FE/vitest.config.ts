import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

/**
 * Unit/component tests deliberately do NOT load the React Router Vite plugin:
 * route modules are tested through their exported components and helpers, not
 * through the framework's build pipeline. E2E coverage lives in `e2e/`.
 */
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./app/test/setup.ts"],
    include: ["app/**/*.test.{ts,tsx}"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["app/**/*.{ts,tsx}"],
      exclude: ["app/**/*.test.{ts,tsx}", "app/test/**", "app/mocks/**"],
    },
  },
});
