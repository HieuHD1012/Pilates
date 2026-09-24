import { api } from "../client";
import type {
  LeadListParams,
  LeadResponse,
  LeadUpdateRequest,
  StudentResponse,
} from "../schema";

/** `docs/api/leads/` — ADMIN and STAFF. */
export const leadsApi = {
  /** `GET /leads` */
  list: (params: LeadListParams = {}) =>
    api.get<LeadResponse[]>("/leads", { searchParams: params }),

  /** `GET /leads/{lead_id}` */
  get: (leadId: number) => api.get<LeadResponse>(`/leads/${leadId}`),

  /** `PATCH /leads/{lead_id}` — `CONVERTED` is not settable here. */
  update: (leadId: number, body: LeadUpdateRequest) =>
    api.patch<LeadResponse>(`/leads/${leadId}`, body),

  /**
   * `POST /leads/{lead_id}/convert` — takes no body: the student profile is
   * built from the lead the studio already has. Returns the new student.
   */
  convert: (leadId: number) => api.post<StudentResponse>(`/leads/${leadId}/convert`),
};
