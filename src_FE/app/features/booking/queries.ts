import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { bookingsApi, classesApi, myScheduleApi } from "~/lib/api/endpoints";
import { queryKeys, roots } from "~/lib/api/query-keys";
import type {
  ClassSessionResponse,
  ClassType,
  IsoDate,
  MyScheduleParams,
} from "~/lib/api/schema";
import { addDays } from "~/lib/format";

export interface StudentClassFilters {
  from: IsoDate;
  to: IsoDate;
  classType?: ClassType | "all";
}

/** A class in the list, with the backend's verdict on whether it is bookable. */
export interface BookableClass extends ClassSessionResponse {
  /**
   * From `GET /my-schedule/bookable`, which answers with the ids the student's
   * packages can actually pay for. Deciding this in the client would mean a
   * second copy of the package-choosing rule, and the copy is what drifts.
   */
  canBook: boolean;
}

/**
 * The classes a student may look at, with the ones they can book marked.
 *
 * Two requests, deliberately: `GET /classes` is already scoped to live classes
 * for a student, and `GET /my-schedule/bookable` is the eligibility answer. The
 * list shows both — a class that is visible but not bookable is information,
 * whereas hiding it leaves a student wondering where Tuesday went.
 */
export function useBookableClasses(filters: StudentClassFilters) {
  const params = {
    starts_from: `${filters.from}T00:00:00`,
    starts_to: `${addDays(filters.to, 1)}T00:00:00`,
    class_type: filters.classType === "all" ? undefined : filters.classType,
    status: "SCHEDULED" as const,
    limit: 300,
  };

  return useQuery({
    queryKey: queryKeys.classes.bookableList(params),
    async queryFn(): Promise<BookableClass[]> {
      const [sessions, bookableIds] = await Promise.all([
        classesApi.list(params),
        myScheduleApi.bookable({ starts_to: params.starts_to, limit: 300 }),
      ]);
      const bookable = new Set(bookableIds);
      return sessions.map((session) => ({ ...session, canBook: bookable.has(session.id) }));
    },
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  });
}

/** One class. A student gets the short projection: no seat counts. */
export function useClassSession(sessionId: number) {
  return useQuery({
    queryKey: queryKeys.classes.detail(sessionId),
    queryFn: () => classesApi.get(sessionId),
    staleTime: 10_000,
  });
}

/** The ids this student can book right now, for a single class's button state. */
export function useBookableIds() {
  const params = { limit: 300 } as const;
  return useQuery({
    queryKey: queryKeys.mySchedule.bookable(params),
    queryFn: () => myScheduleApi.bookable(params),
    staleTime: 15_000,
  });
}

// A student's packages and their credit ledger live in `features/commerce`:
// they are the same two endpoints staff read, and one screen's copy of them
// would be the copy that stops matching.

/**
 * "My schedule" — each row carries the consequence of cancelling it right now.
 *
 * There is no separate history endpoint: past and cancelled bookings come from
 * here with `include_cancelled`, and the screen splits them by `starts_at`.
 */
export function useMySchedule(params: MyScheduleParams = {}) {
  return useQuery({
    queryKey: queryKeys.mySchedule.list(params),
    queryFn: () => myScheduleApi.list(params),
    staleTime: 15_000,
  });
}

/**
 * Everything a booking transaction touches: the schedule it lands in, the class
 * whose seat it took, the package the credit came out of, and the rosters staff
 * are looking at.
 */
function invalidateBooking(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: roots.mySchedule }),
    queryClient.invalidateQueries({ queryKey: roots.classes }),
    queryClient.invalidateQueries({ queryKey: roots.bookings }),
    queryClient.invalidateQueries({ queryKey: roots.packages }),
  ]);
}

/**
 * Booking spends a credit, so there is NO optimistic update. Showing a seat
 * taken and a balance reduced before the backend has agreed would, on a full
 * class, be a lie the student acts on. The button waits; the backend decides.
 *
 * `student_package_id` is deliberately not sent: the backend picks the active
 * package expiring soonest, and that rule belongs in exactly one place.
 */
export function useBookClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (classSessionId: number) =>
      bookingsApi.create({ class_session_id: classSessionId }),
    onSuccess: () => invalidateBooking(queryClient),
  });
}

/**
 * Cancelling is the mirror of booking and is not optimistic either. Whether the
 * credit comes back is the backend's answer (`refunded`), never this hook's
 * arithmetic — and the call is idempotent, so a double click costs nothing.
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: number) => bookingsApi.cancel(bookingId),
    onSuccess: () => invalidateBooking(queryClient),
  });
}

/**
 * Moving to another class: one transaction, both halves or neither. There is no
 * list of "eligible" target classes to fetch — the student picks any session
 * and the backend accepts or refuses it.
 */
export function useChangeBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      newClassSessionId,
    }: {
      bookingId: number;
      newClassSessionId: number;
    }) => bookingsApi.change(bookingId, { new_class_session_id: newClassSessionId }),
    onSuccess: () => invalidateBooking(queryClient),
  });
}
