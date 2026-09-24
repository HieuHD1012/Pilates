import { api } from "../client";
import type {
  TrainerCreateRequest,
  TrainerListParams,
  TrainerResponse,
  TrainerUpdateRequest,
} from "../schema";

/**
 * `docs/api/trainers/`. A trainer may open and edit their own profile, but
 * cannot publish themselves (`is_public`) or move the profile to another login.
 */
export const trainersApi = {
  /** `GET /trainers` — ADMIN, STAFF. */
  list: (params: TrainerListParams = {}) =>
    api.get<TrainerResponse[]>("/trainers", { searchParams: params }),

  /** `GET /trainers/{trainer_id}` — someone else's id answers 404, like a missing one. */
  get: (trainerId: number) => api.get<TrainerResponse>(`/trainers/${trainerId}`),

  /** `POST /trainers` */
  create: (body: TrainerCreateRequest) => api.post<TrainerResponse>("/trainers", body),

  /** `PATCH /trainers/{trainer_id}` */
  update: (trainerId: number, body: TrainerUpdateRequest) =>
    api.patch<TrainerResponse>(`/trainers/${trainerId}`, body),

  /** `GET /trainers/{id}/photo` — 404 with code `NO_PHOTO` when there is none. */
  photoBlob: (trainerId: number) => api.blob(`/trainers/${trainerId}/photo`),

  /** `POST /trainers/{id}/photo` — multipart; the image is re-encoded, stripping metadata. */
  uploadPhoto: (trainerId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<TrainerResponse>(`/trainers/${trainerId}/photo`, form);
  },
};
