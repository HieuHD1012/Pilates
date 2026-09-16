import { useEffect } from "react";
import type { NavigateFunction } from "react-router";

import { UNAUTHORIZED_EVENT } from "~/lib/api/client";

/**
 * A single place that reacts to the backend saying "you are not signed in".
 *
 * Individual queries never handle 401 themselves — that would scatter the
 * redirect across dozens of call sites and produce racing navigations.
 */
export function useUnauthorizedRedirect(navigate: NavigateFunction): void {
  useEffect(() => {
    function onUnauthorized() {
      const { pathname, search } = window.location;
      if (pathname.startsWith("/dang-nhap")) return;
      // Public routes stay public — a stale session must not eject a visitor
      // who is only reading the marketing site.
      if (!/^\/(hv|hlv|studio)(\/|$)/.test(pathname)) return;

      const next = encodeURIComponent(`${pathname}${search}`);
      navigate(`/dang-nhap?next=${next}`, { replace: true });
    }

    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [navigate]);
}
