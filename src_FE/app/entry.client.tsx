import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

/**
 * Mock Service Worker boots BEFORE hydration so the first render of a runtime
 * route already has an intercepted network. It is behind an env flag and is
 * dynamically imported, so the production bundle never contains fixtures.
 */
async function prepare(): Promise<void> {
  if (!import.meta.env.DEV) return;
  // On by default in development: there is no backend yet, so a fresh clone
  // must render real screens. Set VITE_ENABLE_MSW=false to hit a real API.
  if (import.meta.env.VITE_ENABLE_MSW === "false") return;

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
