import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { authApi } from "~/lib/api/endpoints";
import { getTokens } from "~/lib/api/tokens";

/**
 * Signing out clears the whole cache, not just the session key. Any query held
 * in memory was fetched under the previous identity, and leaving it there is
 * how one account briefly sees another's roster.
 *
 * `authApi.logout` drops the tokens even if the call fails: the server revokes
 * all sessions, but this device ending its session must not depend on the
 * network.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => authApi.logout(),
    async onSettled() {
      // A late logout response must not clear or redirect a subsequent login.
      if (getTokens() === null) {
        queryClient.clear();
        await navigate("/dang-nhap", { replace: true });
      }
    },
  });
}
