import { api } from "../client";
import type {
  AnnouncementCreateRequest,
  AnnouncementListParams,
  AnnouncementResponse,
  AnnouncementUpdateRequest,
} from "../schema";

/**
 * `docs/api/announcements/` — the staff side of what `/public/announcements`
 * shows. `title` and `body` run through the content-rule validator on write:
 * this is the only layer that catches copy typed after go-live.
 */
export const announcementsApi = {
  /** `GET /announcements` — includes unpublished drafts. */
  list: (params: AnnouncementListParams = {}) =>
    api.get<AnnouncementResponse[]>("/announcements", { searchParams: params }),

  /** `POST /announcements` */
  create: (body: AnnouncementCreateRequest) =>
    api.post<AnnouncementResponse>("/announcements", body),

  /** `PATCH /announcements/{announcement_id}` */
  update: (announcementId: number, body: AnnouncementUpdateRequest) =>
    api.patch<AnnouncementResponse>(`/announcements/${announcementId}`, body),

  /** `DELETE /announcements/{announcement_id}` — permanent. */
  remove: (announcementId: number) => api.delete<void>(`/announcements/${announcementId}`),
};
