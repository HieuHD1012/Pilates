import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { ApiError } from "~/lib/api/client";
import { authApi } from "~/lib/api/endpoints";
import { queryKeys } from "~/lib/api/query-keys";
import type { MeResponse, Role } from "~/lib/api/schema";

/**
 * The signed-in user, as the backend understands it.
 *
 * `GET /auth/me` is the ONLY source of the role and of `student_id` /
 * `trainer_id`. They are not read out of the JWT payload and not mirrored into
 * a store: the token is a credential, not a profile, and a copy of the role in
 * the client is a copy that can be edited.
 */
export function useSession(): UseQueryResult<MeResponse | null, Error> {
  return useQuery({
    queryKey: queryKeys.session(),
    async queryFn() {
      try {
        return await authApi.me();
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

/** Where each role lands when it has nowhere more specific to go. */
export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/hv/lop-hoc",
  TRAINER: "/hlv/hom-nay",
  STAFF: "/studio/tong-quan",
  ADMIN: "/studio/tong-quan",
};

/** Everyone who works at the studio, as opposed to attending it. */
export const STUDIO_ROLES: Role[] = ["ADMIN", "STAFF"];
