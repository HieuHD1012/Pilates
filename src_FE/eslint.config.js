import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "build/**",
      ".react-router/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "public/mockServiceWorker.js",
      "docs/source/**",
      ".agents/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      /**
       * ARCHITECTURAL GUARDRAILS — machine-enforced versions of AGENTS.md.
       * Prose rules that agents can forget are encoded here instead.
       */
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "axios",
              message:
                "Use the typed adapter in ~/lib/api/client.ts (fetch-based). See docs/QUERY_CONVENTIONS.md.",
            },
            {
              name: "zustand",
              message:
                "Backend entities never live in a client global store. Mutable server state belongs to TanStack Query. See docs/DATA_OWNERSHIP.md.",
            },
            {
              name: "redux",
              message: "See docs/DATA_OWNERSHIP.md — no second server-state cache.",
            },
            {
              name: "@reduxjs/toolkit",
              message: "See docs/DATA_OWNERSHIP.md — no second server-state cache.",
            },
            {
              name: "next",
              message:
                "This repository is React Router framework mode only. See docs/adr/0001.",
            },
          ],
          patterns: [
            {
              group: ["**/mocks/**"],
              message:
                "MSW fixtures must never be imported by application code. They are wired in ~/entry.client.tsx behind an env flag.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name='useEffect'] > ArrowFunctionExpression CallExpression[callee.name='fetch']",
          message:
            "useEffect + fetch is not the server-data strategy in this repository. Use TanStack Query (docs/QUERY_CONVENTIONS.md).",
        },
        {
          selector:
            "CallExpression[callee.object.name='window'][callee.property.name='alert']",
          message: "Use the design-system dialog/toast primitives instead of window.alert.",
        },
      ],
    },
  },
  {
    // Design-system + route modules may need richer JSX ergonomics.
    // Tests are the one place allowed to reach into the fixtures.
    files: [
      "app/mocks/**/*.{ts,tsx}",
      "app/test/**/*.{ts,tsx}",
      "app/**/*.test.{ts,tsx}",
      "scripts/**/*.mjs",
    ],
    rules: {
      "no-restricted-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["e2e/**/*.ts", "scripts/**/*.mjs", "*.config.{ts,js,mjs}"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    /**
     * Các script `tang1-*` là driver Playwright: chúng chứa cả code chạy trong
     * Node và code chạy trong trang qua `page.evaluate`. Cần cả hai bộ global —
     * tắt `no-undef` thì mất luôn lỗi gõ sai tên thật.
     */
    files: ["scripts/tang1-*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { "no-restricted-imports": "off" },
  },
);
