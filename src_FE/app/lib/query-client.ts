import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "./api/client";

/**
 * Defaults tuned for an operational studio product:
 *  - short staleness, because rosters and capacities move while staff watch;
 *  - never retry a decision the backend already made (4xx) — retrying a "class
 *    full" or "no sessions left" response only delays the honest answer;
 *  - refetch on focus, because a staff tab is often left open for hours.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry(failureCount, error) {
          if (error instanceof ApiError) {
            if (error.status >= 400 && error.status < 500) return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
