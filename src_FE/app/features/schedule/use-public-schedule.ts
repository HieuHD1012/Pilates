import { useQuery } from "@tanstack/react-query";

import { api } from "~/lib/api/client";
import { queryKeys } from "~/lib/api/query-keys";
import type { PublicClassSession } from "~/lib/api/types";

/**
 * The public timetable is MUTABLE studio data, so it is owned by TanStack
 * Query even though the page around it is pre-rendered. The document ships
 * with its SEO copy in the HTML; the schedule hydrates on arrival.
 * See docs/DATA_OWNERSHIP.md.
 */
export function usePublicSchedule(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.publicSchedule(from, to),
    queryFn: () =>
      api.get<{ items: PublicClassSession[] }>("/public/schedule", {
        searchParams: { from, to },
      }),
    select: (data) => data.items,
    staleTime: 60_000,
  });
}
