import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bookingsApi, classesApi, studentsApi } from "~/lib/api/endpoints";
import { invalidateChange } from "~/lib/api/invalidation";
import { queryKeys } from "~/lib/api/query-keys";
import type { AttendanceStatus, BookingStatus } from "~/lib/api/schema";

/**
 * Who is in a class — two audiences, two endpoints, on purpose.
 *
 * Staff read `GET /bookings?class_session_id=`, which returns ids and statuses
 * and no names. Trainers read `GET /classes/{id}/attendance`, which carries the
 * student's name and deliberately carries no money or package information.
 *
 * Neither list is filtered here. The backend scopes what each role may read;
 * filtering in the client would be a guard pretending to be authorization
 * (docs/DATA_OWNERSHIP.md).
 */

export interface RosterRow {
  bookingId: number;
  studentId: number;
  studentName: string;
  phone: string | null;
  status: BookingStatus;
  createdAt: string;
}

/**
 * The staff roster, with names.
 *
 * `GET /bookings` answers with `student_id` only, so the names come from
 * `GET /students` and are joined here. Offset pages are read until complete so
 * a student outside the first 200 rows still has their real name.
 */
export function useClassRoster(sessionId: number) {
  return useQuery({
    queryKey: queryKeys.bookings.roster(sessionId),
    async queryFn(): Promise<RosterRow[]> {
      const [bookings, students] = await Promise.all([
        bookingsApi.list({ class_session_id: sessionId, limit: 500 }),
        studentsApi.all(),
      ]);
      const byId = new Map(students.map((student) => [student.id, student]));

      return bookings.map((booking) => {
        const student = byId.get(booking.student_id);
        return {
          bookingId: booking.id,
          studentId: booking.student_id,
          // Preserve the booking if a profile is unavailable to this role.
          studentName: student?.full_name ?? `Học viên #${booking.student_id}`,
          phone: student?.phone ?? null,
          status: booking.status,
          createdAt: booking.created_at,
        };
      });
    },
    staleTime: 15_000,
  });
}

/**
 * The trainer's attendance list. Readable before the class ends so the trainer
 * can prepare; marking is refused until after `ends_at`. Cancelled bookings do
 * not appear at all.
 */
export function useAttendanceRoster(sessionId: number) {
  return useQuery({
    queryKey: queryKeys.classes.attendance(sessionId),
    queryFn: () => classesApi.attendance(sessionId),
    staleTime: 15_000,
  });
}

/**
 * Marking attendance. Two values, `ATTENDED` and `NO_SHOW`, and a correction is
 * allowed — the backend records who marked it and when, and the credit balance
 * does not move either way.
 */
export function useMarkAttendance(_sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: number; status: AttendanceStatus }) =>
      bookingsApi.markAttendance(bookingId, { status }),
    async onSuccess() {
      await invalidateChange(queryClient, "attendance");
    },
  });
}
