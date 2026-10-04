import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    // Advisory only; scripts/check-bundle-budget.mjs enforces gzip budgets.
    chunkSizeWarningLimit: 400,
  },
});
