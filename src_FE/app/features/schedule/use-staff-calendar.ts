import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "~/lib/api/client";
import { queryKeys, type ClassListFilters } from "~/lib/api/query-keys";
import type {
  ClassCancellationInput,
  ClassInput,
  ClassSession,
  RecurringClassInput,
  RecurringClassResult,
  Trainer,
} from "~/lib/api/types";

export function useStaffCalendar(filters: ClassListFilters) {
  return useQuery({
    queryKey: queryKeys.staff.calendar(filters),
    queryFn: () =>
      api.get<{ items: ClassSession[] }>("/staff/calendar", {
        searchParams: {
          from: filters.from,
          to: filters.to,
          type: filters.type ?? "all",
          trainerId: filters.trainerId ?? "all",
        },
      }),
    select: (data) => data.items,
    // A roster changes while staff are looking at it, so keep the window short
    // and let the refetch happen under the existing rows.
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  });
}

export function useStaffTrainers() {
  return useQuery({
    queryKey: queryKeys.staff.trainers(),
    queryFn: () => api.get<{ items: Trainer[] }>("/staff/trainers"),
    select: (data) => data.items,
    staleTime: 5 * 60_000,
  });
}

/**
 * Every class write invalidates the same three readers: the staff calendar, the
 * class's own roster, and the trainer's schedule. A class moving is the one edit
 * that changes what three different people see next.
 */
function invalidateSchedule(
  queryClient: ReturnType<typeof useQueryClient>,
  classId?: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["staff", "calendar"] }),
    queryClient.invalidateQueries({ queryKey: ["trainer", "schedule"] }),
    queryClient.invalidateQueries({ queryKey: ["public", "schedule"] }),
    ...(classId
      ? [
          queryClient.invalidateQueries({ queryKey: queryKeys.staff.classRoster(classId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.trainer.roster(classId) }),
        ]
      : []),
  ]);
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ClassInput) => api.post<ClassSession>("/staff/classes", input),
    onSuccess: (created) => invalidateSchedule(queryClient, created.id),
  });
}

export function useCreateRecurringClasses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecurringClassInput) =>
      api.post<RecurringClassResult>("/staff/classes/recurring", input),
    onSuccess: () => invalidateSchedule(queryClient),
  });
}

export function useUpdateClass(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ClassInput) =>
      api.patch<ClassSession>(`/staff/classes/${classId}`, input),
    onSuccess: () => invalidateSchedule(queryClient, classId),
  });
}

/** Never optimistic: a class that vanishes and comes back is worse than a wait. */
export function useCancelClass(classId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ClassCancellationInput) =>
      api.post<ClassSession>(`/staff/classes/${classId}/cancellation`, input),
    onSuccess: () => invalidateSchedule(queryClient, classId),
  });
}
