/**
 * Whether Mock Service Worker is answering this session's requests.
 *
 * Two things read it and they must agree: `app/entry.client.tsx`, which decides
 * whether to start the worker, and `<DemoDataNotice>`, which warns that what is
 * on screen is fixture data. Deriving the notice from `import.meta.env.DEV`
 * alone made it lie in the one case that matters — a developer pointing the dev
 * server at the real backend, where it labelled a real studio's schedule as
 * invented.
 *
 * It is a compile-time constant, so production builds drop both the worker and
 * the notice regardless of the flag.
 */
export const MOCKS_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW !== "false";
