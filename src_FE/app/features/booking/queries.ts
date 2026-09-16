import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "~/lib/api/client";
import { queryKeys, type ClassListFilters } from "~/lib/api/query-keys";
import type {
  Booking,
  BookingEligibility,
  BookingHistoryEntry,
  CancellationTerms,
  ClassSession,
  RescheduleOption,
  StudentPackage,
} from "~/lib/api/types";

export interface StudentProfile {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  joinedAt: string;
}

export interface BookableClass extends ClassSession {
  eligibility: BookingEligibility;
}

export interface BookableClassDetail extends BookableClass {
  cancellationPreview: CancellationTerms | null;
}

export function useBookableClasses(filters: ClassListFilters) {
  return useQuery({
    queryKey: queryKeys.student.classes(filters),
    queryFn: () =>
      api.get<{ items: BookableClass[] }>("/student/classes", {
        searchParams: {
          from: filters.from,
          to: filters.to,
          type: filters.type ?? "all",
        },
      }),
    select: (data) => data.items,
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  });
}

export function useBookableClass(classId: string) {
  return useQuery({
    queryKey: queryKeys.student.class(classId),
    queryFn: () => api.get<BookableClassDetail>(`/student/classes/${classId}`),
    staleTime: 10_000,
  });
}

export function useStudentPackages() {
  return useQuery({
    queryKey: queryKeys.student.packages(),
    queryFn: () => api.get<{ items: StudentPackage[] }>("/student/packages"),
    select: (data) => data.items,
    staleTime: 30_000,
  });
}

export function useStudentBookings(scope: "upcoming" | "history") {
  return useQuery({
    queryKey: queryKeys.student.bookings(scope),
    queryFn: () =>
      api.get<{ items: Booking[] }>("/student/bookings", { searchParams: { scope } }),
    select: (data) => data.items,
    staleTime: 15_000,
  });
}

/**
 * Booking is a transaction against the student's session balance, so there is
 * NO optimistic update here. Showing a booked seat and a decremented balance
 * before the backend has agreed would, on a full class, be a lie the user acts
 * on. The button waits; the backend decides. See docs/BUSINESS_RULES.md.
 */
export function useBookClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (classSessionId: string) =>
      api.post<Booking>("/student/bookings", { classSessionId }),
    async onSuccess(booking) {
      // Everything the transaction touched: this class, the class lists, the
      // student's schedule, and the balance the deduction came out of.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.student.class(booking.classSession.id),
        }),
        queryClient.invalidateQueries({ queryKey: ["student", "classes"] }),
        queryClient.invalidateQueries({ queryKey: ["student", "bookings"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.student.packages() }),
      ]);
    },
  });
}

export function useBookingHistory() {
  return useQuery({
    queryKey: queryKeys.student.bookings("history"),
    queryFn: () => api.get<{ items: BookingHistoryEntry[] }>("/student/bookings/history"),
    select: (data) => data.items,
    staleTime: 60_000,
  });
}

export function useStudentProfile() {
  return useQuery({
    queryKey: queryKeys.student.profile(),
    queryFn: () => api.get<StudentProfile>("/student/profile"),
    staleTime: 5 * 60_000,
  });
}

/**
 * Cancelling is the mirror of booking: it moves the session balance, so it is
 * not optimistic either. Whether the session comes back is the backend's
 * decision (`cancellation.refundable`), never this hook's arithmetic.
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) =>
      api.delete<{ refunded: boolean; sessionsReturned: number }>(
        `/student/bookings/${bookingId}`,
      ),
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["student", "bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["student", "classes"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.student.packages() }),
        queryClient.invalidateQueries({ queryKey: ["staff", "calendar"] }),
      ]);
    },
  });
}

/**
 * Where this booking may move to. Only fetched when the dialog is open, and the
 * list is the backend's judgement — this hook never filters it.
 */
export function useStudentRescheduleOptions(bookingId: string | null) {
  return useQuery({
    queryKey: ["student", "booking", bookingId, "reschedule-options"] as const,
    queryFn: () =>
      api.get<{ items: RescheduleOption[]; reason?: string }>(
        `/student/bookings/${bookingId}/reschedule-options`,
      ),
    enabled: bookingId !== null,
    staleTime: 15_000,
  });
}

/**
 * Moving a booking is not a cancel-and-rebook: it carries the session already
 * charged. Not optimistic, for the same reason booking is not — a seat shown as
 * taken before the backend agreed is a lie the student acts on.
 */
export function useStudentReschedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      targetClassId,
    }: {
      bookingId: string;
      targetClassId: string;
    }) => api.patch<Booking>(`/student/bookings/${bookingId}`, { classId: targetClassId }),
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["student", "bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["student", "classes"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.student.packages() }),
        queryClient.invalidateQueries({ queryKey: ["staff", "calendar"] }),
      ]);
    },
  });
}
