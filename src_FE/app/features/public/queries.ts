import { useMutation, useQuery } from "@tanstack/react-query";

import { publicApi } from "~/lib/api/endpoints";
import { queryKeys } from "~/lib/api/query-keys";
import type { PublicLeadRequest } from "~/lib/api/schema";
import { studioDateKey } from "~/lib/format";

/**
 * The public site's data. Everything here is MUTABLE studio data owned by
 * TanStack Query even though the pages around it are pre-rendered: the
 * document ships with its SEO copy in the HTML, the studio's facts hydrate on
 * arrival. See docs/DATA_OWNERSHIP.md.
 */

/**
 * `GET /public/schedule` takes a forward-looking **day count**, not a range:
 * it serves upcoming classes only. So a week view asks for enough days to
 * reach the end of the week it is showing and narrows to it here.
 *
 * A week in the past therefore comes back empty. That is the honest answer —
 * the endpoint does not serve history, and filling those cells from anywhere
 * else would be inventing a timetable.
 */
export function usePublicSchedule(weekStart: string, weekEnd: string) {
  const days = daysBetween(studioDateKey(new Date()), weekEnd) + 1;

  return useQuery({
    queryKey: queryKeys.pub.schedule(days),
    queryFn: () => publicApi.schedule(Math.min(days, 60)),
    select: (sessions) =>
      sessions.filter((session) => {
        const day = studioDateKey(session.starts_at);
        return day >= weekStart && day <= weekEnd;
      }),
    enabled: days > 0,
    staleTime: 60_000,
  });
}

function daysBetween(from: string, to: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY,
  );
}

/** `GET /public/trainers` — only those the studio has published. */
export function usePublicTrainers() {
  return useQuery({
    queryKey: queryKeys.pub.trainers(),
    queryFn: () => publicApi.trainers(),
    staleTime: 5 * 60_000,
  });
}

/** `GET /public/packages` — `price` may be `null` until the studio supplies one. */
export function usePublicPackages() {
  return useQuery({
    queryKey: queryKeys.pub.packages(),
    queryFn: () => publicApi.packages(),
    staleTime: 5 * 60_000,
  });
}

/** `GET /public/announcements` — published, and not before `publish_at`. */
export function usePublicAnnouncements(limit = 20) {
  return useQuery({
    queryKey: queryKeys.pub.announcements(limit),
    queryFn: () => publicApi.announcements(limit),
    staleTime: 5 * 60_000,
  });
}

/**
 * `POST /public/leads` — the consultation form.
 *
 * The backend answers with the same message whether the lead is new or a
 * duplicate submission, so the success copy must not claim a record was
 * created. It says the studio will be in touch, which is true either way.
 */
export function useSubmitLead() {
  return useMutation({
    mutationFn: (body: PublicLeadRequest) => publicApi.createLead(body),
  });
}
