import { api } from "../client";
import type {
  AttendanceRequest,
  AttendanceResponse,
  BookingCreateRequest,
  BookingListParams,
  BookingResponse,
  BookingResult,
  CancelBookingRequest,
  CancelBookingResult,
  ChangeBookingRequest,
  ChangeBookingResult,
} from "../schema";

/**
 * `docs/api/bookings/` — the group that is easiest to get wrong.
 *
 * Booking, cancelling and changing are **STUDENT-only, own profile only**.
 * Staff and trainers cannot act on a student's behalf; that is a confirmed
 * rule, not a missing endpoint. Staff read the roster through `list`.
 */
export const bookingsApi = {
  /** `GET /bookings` — ADMIN, STAFF. Students read `/my-schedule` instead. */
  list: (params: BookingListParams = {}) =>
    api.get<BookingResponse[]>("/bookings", { searchParams: params }),

  /**
   * `POST /bookings` — deducts one credit immediately. Leave
   * `student_package_id` unset: the backend picks the active package expiring
   * soonest, and a second copy of that rule in the client is the one that drifts.
   */
  create: (body: BookingCreateRequest) => api.post<BookingResult>("/bookings", body),

  /**
   * `POST /bookings/{id}/cancel` — idempotent. In time refunds the credit; past
   * the deadline it answers `CANCELLATION_CLOSED` and changes nothing.
   */
  cancel: (bookingId: number, body: CancelBookingRequest = {}) =>
    api.post<CancelBookingResult>(`/bookings/${bookingId}/cancel`, body),

  /** `POST /bookings/{id}/change` — both halves succeed or neither does. */
  change: (bookingId: number, body: ChangeBookingRequest) =>
    api.post<ChangeBookingResult>(`/bookings/${bookingId}/change`, body),

  /**
   * `PATCH /bookings/{id}/attendance` — TRAINER, own class, after `ends_at`.
   * Corrections are allowed and never move the credit balance.
   */
  markAttendance: (bookingId: number, body: AttendanceRequest) =>
    api.patch<AttendanceResponse>(`/bookings/${bookingId}/attendance`, body),
};
