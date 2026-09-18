import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bookingsApi, classesApi, studentsApi } from "~/lib/api/endpoints";
import { queryKeys, roots } from "~/lib/api/query-keys";
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
 * `GET /students` and are joined here. One request for the class and one for
 * the roll is the whole cost; the alternative — a request per row — is how a
 * twelve-person class becomes thirteen round trips.
 */
export function useClassRoster(sessionId: number) {
  return useQuery({
    queryKey: queryKeys.bookings.list({ class_session_id: sessionId }),
    async queryFn(): Promise<RosterRow[]> {
      const [bookings, students] = await Promise.all([
        bookingsApi.list({ class_session_id: sessionId, limit: 500 }),
        studentsApi.list({ limit: 200 }),
      ]);
      const byId = new Map(students.map((student) => [student.id, student]));

      return bookings.map((booking) => {
        const student = byId.get(booking.student_id);
        return {
          bookingId: booking.id,
          studentId: booking.student_id,
          // A student outside the first page of the roll still gets a row: the
          // booking is the fact, the name is the decoration.
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
export function useMarkAttendance(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: number; status: AttendanceStatus }) =>
      bookingsApi.markAttendance(bookingId, { status }),
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.classes.attendance(sessionId),
        }),
        queryClient.invalidateQueries({ queryKey: roots.bookings }),
        // A marked booking can no longer be cancelled, so the student's own
        // schedule is stale the moment this succeeds.
        queryClient.invalidateQueries({ queryKey: roots.mySchedule }),
      ]);
    },
  });
}
