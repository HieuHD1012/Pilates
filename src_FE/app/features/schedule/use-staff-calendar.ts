import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bookingsApi, classesApi, trainersApi } from "~/lib/api/endpoints";
import { invalidateChange } from "~/lib/api/invalidation";
import { queryKeys } from "~/lib/api/query-keys";
import type {
  AssignTrainerRequest,
  CancelSessionRequest,
  ClassCreateRequest,
  ClassListParams,
  ClassType,
  IsoDate,
  RecurrenceRequest,
} from "~/lib/api/schema";
import { addDays } from "~/lib/format";

export interface CalendarFilters {
  /** Studio date key of the first day shown, inclusive. */
  from: IsoDate;
  /** Studio date key of the last day shown, inclusive. */
  to: IsoDate;
  classType?: ClassType | "all";
  trainerId?: number | "all";
}

/**
 * The range the backend wants is **half-open** — `starts_from <= x < starts_to`
 * — while a calendar thinks in inclusive days. Converting in one place is the
 * difference between showing Sunday and silently dropping it.
 */
export function toClassListParams(filters: CalendarFilters): ClassListParams {
  return {
    starts_from: `${filters.from}T00:00:00+07:00`,
    starts_to: `${addDays(filters.to, 1)}T00:00:00+07:00`,
    class_type: filters.classType === "all" ? undefined : filters.classType,
    trainer_id: filters.trainerId === "all" ? undefined : filters.trainerId,
    limit: 500,
  };
}

export function useStaffCalendar(filters: CalendarFilters) {
  const params = toClassListParams(filters);
  return useQuery({
    queryKey: queryKeys.classes.list(params),
    queryFn: () => classesApi.list(params),
    // A calendar changes while staff are looking at it, so keep the window
    // short and let the refetch happen under the existing rows.
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  });
}

/**
 * The studio's trainers.
 *
 * `GET /classes` returns `trainer_id` and no name, so every schedule surface
 * joins against this list. Near-static, hence the long staleness.
 */
export function useStudioTrainers() {
  return useQuery({
    queryKey: queryKeys.trainers.directory(),
    queryFn: () => trainersApi.all(),
    staleTime: 5 * 60_000,
  });
}

/**
 * Seats taken per class, for the week on screen.
 *
 * `GET /classes` carries the capacity but not the occupancy, so this counts
 * held bookings over the same window — `held_only` is the same status set the
 * backend's own `booked_count` uses, which is why the two agree.
 *
 * ADMIN and STAFF only. A trainer cannot read `GET /bookings`, so their week
 * shows capacity and no occupancy rather than a wrong number.
 */
export function useCalendarSeatCounts(filters: CalendarFilters, enabled = true) {
  const queryClient = useQueryClient();
  const range = toClassListParams(filters);
  const params = {
    starts_from: range.starts_from,
    starts_to: range.starts_to,
    held_only: true,
    limit: 500,
  };

  return useQuery({
    queryKey: queryKeys.bookings.seatCounts(params),
    async queryFn() {
      const bookings = await bookingsApi.list(params);
      const counts = new Map<number, number>();
      if (bookings.length === params.limit) {
        // The capped array cannot prove occupancy. Fall back to authoritative
        // per-class counts only on overflow, with bounded network concurrency.
        const classParams = toClassListParams(filters);
        const sessions = await queryClient.fetchQuery({
          queryKey: queryKeys.classes.list(classParams),
          queryFn: () => classesApi.list(classParams),
          staleTime: 15_000,
        });
        for (let offset = 0; offset < sessions.length; offset += 6) {
          const details = await Promise.all(
            sessions.slice(offset, offset + 6).map((session) => classesApi.get(session.id)),
          );
          details.forEach((session) => counts.set(session.id, session.booked_count));
        }
        return counts;
      }
      for (const booking of bookings) {
        counts.set(
          booking.class_session_id,
          (counts.get(booking.class_session_id) ?? 0) + 1,
        );
      }
      return counts;
    },
    enabled,
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  });
}

/**
 * The signed-in trainer's own teaching week.
 *
 * `GET /classes/my-schedule` pins the filter to them at the query level and
 * takes no `trainer_id`, so there is nothing to forge.
 */
export function useTrainerSchedule(from: IsoDate, to: IsoDate) {
  const starts_from = `${from}T00:00:00+07:00`;
  const starts_to = `${addDays(to, 1)}T00:00:00+07:00`;
  return useQuery({
    queryKey: queryKeys.classes.mine(starts_from, starts_to),
    queryFn: () => classesApi.mySchedule({ starts_from, starts_to }),
    staleTime: 15_000,
  });
}

/** Trainer ids to names, for the week views that only receive an id. */
export function trainerNameMap(
  trainers: Array<{ id: number; full_name: string }> | undefined,
): Map<number, string> {
  return new Map((trainers ?? []).map((trainer) => [trainer.id, trainer.full_name]));
}

/**
 * Every class write moves the same readers: the calendar, the class itself,
 * every student schedule that had a booking in it, and the public timetable.
 * One list, so no caller has to remember the fourth one.
 */

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ClassCreateRequest) => classesApi.create(input),
    onSuccess: () => invalidateChange(queryClient, "schedule"),
  });
}

/**
 * The preview before the commit. It is a POST because it takes the whole
 * pattern, but it writes nothing — it answers which occurrences would collide
 * with a trainer's existing classes.
 */
export function usePreviewRecurrence() {
  return useMutation({
    mutationFn: (input: RecurrenceRequest) => classesApi.previewRecurrence(input),
  });
}

/**
 * The currently available occurrences commit together; known conflicts are
 * omitted by the backend. If a slot is taken during the database write,
 * the whole group rolls back with 409 rather than leaving a
 * half-written pattern behind.
 */
export function useCreateRecurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecurrenceRequest) => classesApi.createRecurrence(input),
    onSuccess: () => invalidateChange(queryClient, "schedule"),
  });
}

/**
 * Reassigning the trainer is the only edit a scheduled class allows.
 *
 * There is no endpoint to move a class's time or change its capacity, and that
 * is the confirmed rule rather than a gap: the studio creates and cancels, it
 * does not reschedule people into a new slot.
 */
export function useAssignTrainer(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignTrainerRequest) => classesApi.assignTrainer(sessionId, input),
    onSuccess: () => invalidateChange(queryClient, "schedule"),
  });
}

/** Never optimistic: a class that vanishes and comes back is worse than a wait. */
export function useCancelClass(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CancelSessionRequest) => classesApi.cancel(sessionId, input),
    // Cancelling refunds every booking in the class, so the credit ledgers and
    // the packages holding them move too.
    onSuccess: async () => {
      await invalidateChange(queryClient, "booking");
    },
  });
}

/** One class, with the seat counts staff are allowed to see. */
export function useClassSession(sessionId: number) {
  return useQuery({
    queryKey: queryKeys.classes.detail(sessionId),
    queryFn: () => classesApi.get(sessionId),
    staleTime: 15_000,
  });
}
