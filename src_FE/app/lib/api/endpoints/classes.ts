import { api } from "../client";
import type {
  AssignTrainerRequest,
  AttendanceRosterItem,
  CancelSessionRequest,
  CancelSessionResponse,
  ClassCreateRequest,
  ClassListParams,
  ClassSessionDetailResponse,
  ClassSessionResponse,
  IsoDateTime,
  RecurrenceCreateResponse,
  RecurrencePreviewResponse,
  RecurrenceRequest,
  TrainerMonthStatsResponse,
  TrainerStatsParams,
} from "../schema";

/**
 * `docs/api/classes/`.
 *
 * A session is a time, a trainer, a type and a capacity — there is no title and
 * no room. `GET /classes` returns `trainer_id` only; a screen that needs names
 * joins against `trainersApi.list`.
 */
export const classesApi = {
  /**
   * `GET /classes` — scoped by role inside the query: staff see everything, a
   * trainer sees only their own classes, a student sees live ones. One URL,
   * three answers, by design.
   *
   * The range is half-open: all of 30/09 means `starts_to` = `2026-10-01T00:00:00`.
   */
  list: (params: ClassListParams = {}) =>
    api.get<ClassSessionResponse[]>("/classes", { searchParams: params }),

  /** `GET /classes/{session_id}` — `booked_count`/`seats_left` for staff only. */
  get: (sessionId: number) => api.get<ClassSessionDetailResponse>(`/classes/${sessionId}`),

  /** `POST /classes` — refused when the trainer is already teaching at that hour. */
  create: (body: ClassCreateRequest) => api.post<ClassSessionResponse>("/classes", body),

  /** `GET /classes/my-schedule` — pinned to the signed-in trainer; no id to spoof. */
  mySchedule: (params: { starts_from?: IsoDateTime; starts_to?: IsoDateTime } = {}) =>
    api.get<ClassSessionResponse[]>("/classes/my-schedule", { searchParams: params }),

  /** `POST /classes/recurrence/preview` — shows which occurrences collide first. */
  previewRecurrence: (body: RecurrenceRequest) =>
    api.post<RecurrencePreviewResponse>("/classes/recurrence/preview", body),

  /** `POST /classes/recurrence` — all-or-nothing; a late collision rolls it all back. */
  createRecurrence: (body: RecurrenceRequest) =>
    api.post<RecurrenceCreateResponse>("/classes/recurrence", body),

  /** `GET /classes/trainer-stats` — the same function the trainer report uses. */
  trainerStats: (params: TrainerStatsParams) =>
    api.get<TrainerMonthStatsResponse>("/classes/trainer-stats", {
      searchParams: params,
    }),

  /**
   * `GET /classes/{id}/attendance` — TRAINER, own class. Readable before the
   * class ends so the trainer can prepare; marking is only allowed after
   * `ends_at`. Cancelled bookings do not appear.
   */
  attendance: (sessionId: number) =>
    api.get<AttendanceRosterItem[]>(`/classes/${sessionId}/attendance`),

  /** `POST /classes/{id}/cancel` — refunds everyone booked, whatever the hour. */
  cancel: (sessionId: number, body: CancelSessionRequest) =>
    api.post<CancelSessionResponse>(`/classes/${sessionId}/cancel`, body),

  /** `POST /classes/{id}/trainer` — refused if the new trainer is double-booked. */
  assignTrainer: (sessionId: number, body: AssignTrainerRequest) =>
    api.post<ClassSessionResponse>(`/classes/${sessionId}/trainer`, body),
};
