import { api } from "../client";
import type {
  RenewalCandidateResponse,
  RenewalContactRequest,
  RenewalContactResponse,
  RenewalListParams,
  RenewalSummaryResponse,
} from "../schema";

/**
 * `docs/api/renewals/`.
 *
 * There is no send-a-message endpoint and there will not be one — the "open
 * Zalo" button is a deep link and staff type the message themselves.
 */
export const renewalsApi = {
  /**
   * `GET /renewals` — filters only narrow the default threshold (≤6 credits or
   * ≤15 days). Nothing widens it, so two people looking at this screen are
   * always looking at the same definition of "needs contact".
   */
  list: (params: RenewalListParams = {}) =>
    api.get<RenewalCandidateResponse[]>("/renewals", { searchParams: params }),

  /** `GET /renewals/summary` — head-count only; this board faces the counter. */
  summary: () => api.get<RenewalSummaryResponse>("/renewals/summary"),

  /** `POST /renewals/contacts` — append-only; earlier rows are never edited. */
  logContact: (body: RenewalContactRequest) =>
    api.post<RenewalContactResponse>("/renewals/contacts", body),

  /** `GET /renewals/students/{student_id}/contacts` — newest first. */
  contactHistory: (studentId: number, limit?: number) =>
    api.get<RenewalContactResponse[]>(`/renewals/students/${studentId}/contacts`, {
      searchParams: { limit },
    }),
};
