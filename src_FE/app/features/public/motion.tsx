import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * Scroll reveals on the public site.
 *
 * Follow docs/DESIGN_SYSTEM.md and docs/REFERENCE_LOCK.md: the
 * narrative pages only (home, studio), desktop with a mouse only, secondary
 * elements only (a section's hairline, the method photograph), once per page
 * load, and never for anything already on screen when the page opens. Body
 * text, headings, prices, times, availability and calls to action never wait
 * for a scroll — users read that as a page that is still loading (NN/g).
 *
 * Content is visible by default. CSS hides a `[data-reveal]` element only while
 * `<html data-motion>` is set, and only this effect sets it, after it has
 * marked everything already in view as revealed. No JS, an old browser, a
 * phone or "reduce motion" therefore all see the finished page at once.
 */

/** Routes that tell a story. Everything else on the public site is a task. */
const REVEAL_PATHS = new Set(["/", "/gioi-thieu"]);

const CAPABLE =
  "(min-width: 64rem) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/** Arms the reveals for the current page. Mounted once, in the public layout. */
export function ScrollReveal() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!REVEAL_PATHS.has(pathname)) return;
    if (!("IntersectionObserver" in window) || !window.matchMedia(CAPABLE).matches) return;

    const root = document.documentElement;
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    // Anything on screen as the page opens is already "seen": hiding it now
    // would read as a page still loading, and would delay LCP. The same goes
    // for anything above the window — a restored scroll position or an anchor
    // jump — which would otherwise wait, hidden, for a scroll back up.
    for (const element of targets) {
      if (element.getBoundingClientRect().top < window.innerHeight) {
        element.dataset.revealed = "";
      }
    }

    root.dataset.motion = "";

    const reveal: IntersectionObserverCallback = (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.revealed = "";
        observer.unobserve(entry.target);
      }
    };
    // When each kind fires, as a share of the window height measured up from
    // its bottom edge. Library defaults sit at 80–90% (AOS: 120px in; GSAP
    // reveals: "top 80–85%"; Webflow: 15%).
    //  - A photograph is empty space while hidden, so it fires as soon as its
    //    top is 10% into the window: at most a 90px sliver is ever blank, and
    //    the 0.8s fade still plays while it rises into view.
    //  - The hairline hides nothing (its label is always visible), so it waits
    //    until 15% in and draws where the eye is heading.
    const early = new IntersectionObserver(reveal, { rootMargin: "0px 0px -10% 0px" });
    const later = new IntersectionObserver(reveal, { rootMargin: "0px 0px -15% 0px" });
    for (const element of targets) {
      if ("revealed" in element.dataset) continue;
      (element.dataset.reveal === "rule" ? later : early).observe(element);
    }

    return () => {
      early.disconnect();
      later.disconnect();
      delete root.dataset.motion;
      for (const element of targets) delete element.dataset.revealed;
    };
  }, [pathname]);

  return null;
}
