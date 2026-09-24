import { api, buildUrl } from "../client";
import type {
  MessageResponse,
  PublicAnnouncement,
  PublicClassSession,
  PublicLeadRequest,
  PublicPackage,
  PublicTrainer,
} from "../schema";

/**
 * `docs/api/public/` — no token, and none of these may be called with one
 * attached by accident: `anonymous` keeps a stale session from turning a
 * public page into a 401 for a visitor who never signed in.
 */
export const publicApi = {
  /** `GET /public/trainers` — only trainers the studio has published. */
  trainers: () => api.get<PublicTrainer[]>("/public/trainers", { anonymous: true }),

  /**
   * `GET /public/trainer-photos/{prefix}/{key}` — the one binary endpoint that
   * is a plain `<img src>`: it is public, so there is no header to attach.
   */
  trainerPhotoUrl: (photoKey: string): string => {
    const separator = photoKey.indexOf("/");
    const prefix = photoKey.slice(0, separator);
    const key = photoKey.slice(separator + 1);
    return buildUrl(`/public/trainer-photos/${prefix}/${key}`);
  },

  /** `GET /public/schedule` — `is_full` is a boolean; there is no seat count. */
  schedule: (days?: number) =>
    api.get<PublicClassSession[]>("/public/schedule", {
      anonymous: true,
      searchParams: { days },
    }),

  /** `GET /public/packages` — `price` may be `null` until the studio supplies one. */
  packages: () => api.get<PublicPackage[]>("/public/packages", { anonymous: true }),

  /** `GET /public/announcements` — published only, and not before `publish_at`. */
  announcements: (limit?: number) =>
    api.get<PublicAnnouncement[]>("/public/announcements", {
      anonymous: true,
      searchParams: { limit },
    }),

  /**
   * `POST /public/leads` — the consultation form. Answers with the same message
   * whether the submission is new or a duplicate, so keep the success copy
   * generic rather than claiming a record was created.
   */
  createLead: (body: PublicLeadRequest) =>
    api.post<MessageResponse>("/public/leads", body, { anonymous: true }),
};
