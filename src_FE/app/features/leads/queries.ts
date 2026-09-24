import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { leadsApi } from "~/lib/api/endpoints";
import { queryKeys, roots } from "~/lib/api/query-keys";
import type { LeadListParams, LeadUpdateRequest } from "~/lib/api/schema";

export function useLeads(params: LeadListParams) {
  return useQuery({
    queryKey: queryKeys.leads.list(params),
    queryFn: () => leadsApi.list(params),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useLead(leadId: number | null) {
  return useQuery({
    queryKey: queryKeys.leads.detail(leadId ?? 0),
    queryFn: () => leadsApi.get(leadId as number),
    enabled: leadId !== null,
    staleTime: 30_000,
  });
}

/** Status, the free-text need, and who is following it up. */
export function useUpdateLead(leadId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadUpdateRequest) => leadsApi.update(leadId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roots.leads }),
  });
}

/**
 * Converting a lead into a student.
 *
 * It takes no payload: the student is built from the lead the studio already
 * holds, which is what "keeps the consultation history and does not retype the
 * data" means. `CONVERTED` is reached only this way — it cannot be set by hand
 * on the lead, because the status is a consequence, not a label.
 */
export function useConvertLead(leadId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leadsApi.convert(leadId),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: roots.leads });
      await queryClient.invalidateQueries({ queryKey: roots.students });
    },
  });
}
