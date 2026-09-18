import { api } from "../client";
import type {
  StudentCreateRequest,
  StudentListParams,
  StudentOverviewResponse,
  StudentResponse,
  StudentUpdateRequest,
} from "../schema";

/**
 * `docs/api/students/`. Reads are scoped in the query itself — a signed-in
 * student gets only their own row from the same URL staff use.
 */
export const studentsApi = {
  /** `GET /students` */
  list: (params: StudentListParams = {}) =>
    api.get<StudentResponse[]>("/students", { searchParams: params }),

  /** `GET /students/{student_id}` */
  get: (studentId: number) => api.get<StudentResponse>(`/students/${studentId}`),

  /** `POST /students` — phone is the identity key; duplicates answer 409. */
  create: (body: StudentCreateRequest) => api.post<StudentResponse>("/students", body),

  /** `PATCH /students/{student_id}` */
  update: (studentId: number, body: StudentUpdateRequest) =>
    api.patch<StudentResponse>(`/students/${studentId}`, body),

  /** `GET /students/{id}/overview` — credits from the ledger, active packages only. */
  overview: (studentId: number) =>
    api.get<StudentOverviewResponse>(`/students/${studentId}/overview`),
};
