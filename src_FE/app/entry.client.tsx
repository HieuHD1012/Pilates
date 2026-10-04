import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

import { MOCKS_ENABLED } from "./lib/mocks";

/**
 * Mock Service Worker boots BEFORE hydration so the first render of a runtime
 * route already has an intercepted network. It is behind an env flag and is
 * dynamically imported, so the production bundle never contains fixtures.
 */
async function prepare(): Promise<void> {
  // On by default in development so a fresh clone renders real screens with no
  // backend. Set VITE_ENABLE_MSW=false to hit a real API instead — the same
  // flag hides `<DemoDataNotice>`, so the two can never disagree.
  // Keep DEV directly at the import site so the build eliminates the entire
  // dependency graph, rather than relying on a cross-module constant fold.
  if (!import.meta.env.DEV || !MOCKS_ENABLED) return;

  const { worker } = await import("./mocks/browser");
  await worker.start({
    onUnhandledRequest: "bypass",
    quiet: true,
    serviceWorker: { url: "/mockServiceWorker.js" },
  });
}

void prepare().then(() => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
});
