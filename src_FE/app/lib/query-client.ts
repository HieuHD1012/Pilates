import { QueryCache, QueryClient } from "@tanstack/react-query";

import { ApiError } from "./api/client";

/**
 * Defaults tuned for an operational studio product:
 *  - short staleness, because rosters and capacities move while staff watch;
 *  - never retry a decision the backend already made (4xx) — retrying a "class
 *    full" or "no sessions left" response only delays the honest answer;
 *  - refetch on focus, because a staff tab is often left open for hours.
 */
export function createQueryClient(): QueryClient {
  const queryCache = new QueryCache();
  const photoUrls = new Map<string, string>();
  queryCache.subscribe((event) => {
    if (event.type !== "updated" && event.type !== "removed") return;
    const { query } = event;
    const previous = photoUrls.get(query.queryHash);
    const current = event.type === "removed" ? undefined : query.state.data;
    if (previous && previous !== current) {
      URL.revokeObjectURL(previous);
      photoUrls.delete(query.queryHash);
    }
    if (typeof current === "string" && current.startsWith("blob:")) {
      photoUrls.set(query.queryHash, current);
    }
  });
  return new QueryClient({
    queryCache,
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry(failureCount, error) {
          if (error instanceof ApiError) {
            if (error.code === "result_limit_reached") return false;
            if (error.status >= 400 && error.status < 500) return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
        // Report a failed write immediately, retaining the form for an explicit
        // retry. Silently queuing payments/bookings while offline is misleading.
        networkMode: "always",
      },
    },
  });
}
