import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { realpathSync } from "node:fs";
import { defineConfig, searchForWorkspaceRoot } from "vite";

export default defineConfig({
  cacheDir: ".react-router/vite-cache",
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), realpathSync("node_modules")],
    },
  },
  build: {
    // Fail loudly rather than silently shipping an oversized public bundle.
    chunkSizeWarningLimit: 400,
  },
});
