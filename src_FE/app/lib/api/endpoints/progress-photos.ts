import { api } from "../client";
import type { IsoDateTime, ProgressPhotoResponse } from "../schema";

/**
 * `docs/api/progress-photos/`.
 *
 * **Hide this tab from STAFF entirely** rather than showing it and catching the
 * 403 — see the group README. Deleting is ADMIN-only and deliberately narrower
 * than viewing: a view is a read, a delete is not recoverable.
 */
export const progressPhotosApi = {
  /** `GET /students/{id}/progress-photos` — ordered by `taken_at`. */
  list: (studentId: number) =>
    api.get<ProgressPhotoResponse[]>(`/students/${studentId}/progress-photos`),

  /** `POST /students/{id}/progress-photos` — multipart. */
  upload: (studentId: number, file: File, takenAt?: IsoDateTime) => {
    const form = new FormData();
    form.append("file", file);
    if (takenAt !== undefined) form.append("taken_at", takenAt);
    return api.post<ProgressPhotoResponse>(`/students/${studentId}/progress-photos`, form);
  },

  /** `DELETE /students/{id}/progress-photos/{photo_id}` — ADMIN only. */
  remove: (studentId: number, photoId: number) =>
    api.delete<void>(`/students/${studentId}/progress-photos/${photoId}`),

  /**
   * `GET /students/{id}/progress-photos/{photo_id}/file`.
   *
   * Fetched as a blob, not pointed at with `<img src>`: the bytes are behind a
   * token and re-authorised on every read, so there is no static URL to use.
   */
  fileBlob: (studentId: number, photoId: number) =>
    api.blob(`/students/${studentId}/progress-photos/${photoId}/file`),
};
