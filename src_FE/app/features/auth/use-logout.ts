import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { api } from "~/lib/api/client";

/**
 * Signing out clears the whole cache, not just the session key. Any query held
 * in memory was fetched under the previous identity, and leaving it there is
 * how one account briefly sees another's roster.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => api.post<void>("/auth/logout"),
    async onSettled() {
      queryClient.clear();
      await navigate("/dang-nhap", { replace: true });
    },
  });
}
