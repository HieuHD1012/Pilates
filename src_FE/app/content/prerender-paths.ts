/**
 * Which routes exist as real HTML documents on the CDN.
 *
 * Imported by react-router.config.ts, so this file must stay dependency-free
 * and must not import anything browser-specific.
 *
 * A path belongs here when its content is public, stable between builds and
 * worth indexing. A path must NOT be added here when it renders per-user or
 * mutable data — those routes are served by the SPA fallback and own their
 * data through TanStack Query. See docs/ROUTING.md.
 */
export const publicPrerenderPaths = [
  "/",
  "/gioi-thieu",
  "/dich-vu",
  "/goi-tap",
  "/huan-luyen-vien",
  "/lich-tap",
  "/khuyen-mai",
  "/lien-he",
  "/dat-tu-van",
] as const;

export type PublicPrerenderPath = (typeof publicPrerenderPaths)[number];
