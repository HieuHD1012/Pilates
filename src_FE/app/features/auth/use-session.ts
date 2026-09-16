import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api, ApiError } from "~/lib/api/client";
import { queryKeys } from "~/lib/api/query-keys";
import type { Role, SessionUser } from "~/lib/api/types";

/**
 * The signed-in user, as the backend understands it.
 *
 * This is the ONLY source of identity in the frontend. There is no mirrored
 * copy in a store and no token parsed client-side: authentication and
 * authorization are backend concerns, and everything here is presentation.
 */
export function useSession(): UseQueryResult<SessionUser | null, Error> {
  return useQuery({
    queryKey: queryKeys.session(),
    async queryFn() {
      try {
        return await api.get<SessionUser>("/auth/session");
      } catch (error) {
        // Not signed in is a valid answer, not a failure.
        if (error instanceof ApiError && error.isAuth) return null;
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export const ROLE_HOME: Record<Role, string> = {
  student: "/hv/lop-hoc",
  trainer: "/hlv/hom-nay",
  staff: "/studio/tong-quan",
  owner: "/studio/tong-quan",
};
