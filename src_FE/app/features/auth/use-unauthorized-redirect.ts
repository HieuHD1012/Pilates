import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { NavigateFunction } from "react-router";

import { UNAUTHORIZED_EVENT } from "~/lib/api/client";
import { getSessionVersion, subscribeTokens } from "~/lib/api/tokens";

/**
 * A single place that reacts to the backend saying "you are not signed in".
 *
 * Individual queries never handle 401 themselves — that would scatter the
 * redirect across dozens of call sites and produce racing navigations.
 */
export function useUnauthorizedRedirect(navigate: NavigateFunction): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    let version = getSessionVersion();
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
    const unsubscribe = subscribeTokens((tokens) => {
      const next = getSessionVersion();
      if (version === next) return; // Token rotation preserves the identity.
      version = next;
      queryClient.clear();
      if (tokens === null) onUnauthorized();
    });
    return () => {
      unsubscribe();
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, [navigate, queryClient]);
}
