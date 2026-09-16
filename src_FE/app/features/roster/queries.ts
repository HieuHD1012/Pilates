import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "~/lib/api/client";
import { queryKeys } from "~/lib/api/query-keys";
import type {
  ClassRoster,
  RescheduleOption,
  RosterEntry,
  StaffBookingInput,
} from "~/lib/api/types";

/**
 * One roster shape, two audiences. Staff and trainers see the same list from
 * different endpoints because the backend scopes what a trainer may read; the
 * frontend does not filter it — that would be a guard pretending to be
 * authorization (docs/DATA_OWNERSHIP.md).
 */
export function useClassRoster(classId: string, scope: "staff" | "trainer") {
  return useQuery({
    queryKey:
      scope === "staff"
        ? queryKeys.staff.classRoster(classId)
        : queryKeys.trainer.roster(classId),
    queryFn: () => api.get<ClassRoster>(`/${scope}/classes/${classId}/roster`),
    staleTime: 15_000,
  });
}

/**
 * A roster write changes what three readers see: this class, the studio calendar
 * (its booked count), and the student whose session balance moved.
 */
function invalidateRoster(
  queryClient: ReturnType<typeof useQueryClient>,
  classId: string,
  studentId?: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.staff.classRoster(classId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.trainer.roster(classId) }),
    queryClient.invalidateQueries({ queryKey: ["staff", "calendar"] }),
    queryClient.invalidateQueries({ queryKey: ["trainer", "schedule"] }),
    queryClient.invalidateQueries({ queryKey: ["staff", "ledger"] }),
    queryClient.invalidateQueries({ queryKey: ["staff", "students"] }),
    ...(studentId
      ? [queryClient.invalidateQueries({ queryKey: queryKeys.staff.student(studentId) })]
      : []),
  ]);
}

export function useStaffBookForStudent(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StaffBookingInput) =>
      api.post<RosterEntry>("/staff/bookings", input),
    onSuccess: (entry) => invalidateRoster(queryClient, classId, entry.studentId),
  });
}

export function useStaffCancelBooking(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      api.delete<{ refunded: boolean; entry: RosterEntry }>(`/staff/bookings/${bookingId}`),
    onSuccess: (result) => invalidateRoster(queryClient, classId, result.entry.studentId),
  });
}

/** Only fetched when a reschedule dialog is actually open. */
export function useRescheduleOptions(bookingId: string | null) {
  return useQuery({
    queryKey: ["staff", "booking", bookingId, "reschedule-options"] as const,
    queryFn: () =>
      api.get<{ items: RescheduleOption[] }>(
        `/staff/bookings/${bookingId}/reschedule-options`,
      ),
    select: (data) => data.items,
    enabled: bookingId !== null,
    staleTime: 15_000,
  });
}

export function useStaffRescheduleBooking(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      targetClassId,
    }: {
      bookingId: string;
      targetClassId: string;
    }) =>
      api.patch<RosterEntry>(`/staff/bookings/${bookingId}`, { classId: targetClassId }),
    async onSuccess(entry, variables) {
      await invalidateRoster(queryClient, classId, entry.studentId);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.staff.classRoster(variables.targetClassId),
      });
    },
  });
}
