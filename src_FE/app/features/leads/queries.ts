import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "~/lib/api/client";
import { queryKeys } from "~/lib/api/query-keys";
import type { Lead, LeadDetail, LeadStatus } from "~/lib/api/types";

export function useLeads(status: string) {
  return useQuery({
    queryKey: queryKeys.staff.leads(status),
    queryFn: () => api.get<{ items: Lead[] }>("/staff/leads", { searchParams: { status } }),
    select: (data) => data.items,
    staleTime: 20_000,
    placeholderData: (previous) => previous,
  });
}

export function useLeadDetail(leadId: string) {
  return useQuery({
    queryKey: queryKeys.staff.lead(leadId),
    queryFn: () => api.get<LeadDetail>(`/staff/leads/${leadId}`),
    staleTime: 20_000,
  });
}

/** Logging a consultation outcome. The backend records who and when. */
export function useUpdateLead(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: { status?: LeadStatus; followUpAt?: string | null }) =>
      api.patch<Lead>(`/staff/leads/${leadId}`, patch),
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.staff.lead(leadId) }),
        queryClient.invalidateQueries({ queryKey: ["staff", "leads"] }),
      ]);
    },
  });
}
