import { rm } from "node:fs/promises";

// Vite copies public/ verbatim. This worker belongs to the dev server only.
await rm("build/client/mockServiceWorker.js", { force: true });
