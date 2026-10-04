import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { announcementsApi } from "~/lib/api/endpoints";
import { invalidateChange } from "~/lib/api/invalidation";
import { queryKeys } from "~/lib/api/query-keys";
import type {
  AnnouncementCreateRequest,
  AnnouncementListParams,
  AnnouncementUpdateRequest,
} from "~/lib/api/schema";

export function useAnnouncements(params: AnnouncementListParams) {
  return useQuery({
    queryKey: queryKeys.announcements.list(params),
    queryFn: () => announcementsApi.list(params),
    placeholderData: (previous) => previous,
  });
}

export function useSaveAnnouncement(id?: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: AnnouncementCreateRequest | AnnouncementUpdateRequest) =>
      id === undefined
        ? announcementsApi.create(body as AnnouncementCreateRequest)
        : announcementsApi.update(id, body),
    onSuccess: () => invalidateChange(client, "announcement"),
  });
}

export function useDeleteAnnouncement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => announcementsApi.remove(id),
    onSuccess: () => invalidateChange(client, "announcement"),
  });
}
