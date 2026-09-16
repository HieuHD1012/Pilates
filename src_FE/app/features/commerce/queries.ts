import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "~/lib/api/client";
import { queryKeys } from "~/lib/api/query-keys";
import type {
  PackageDefinition,
  Payment,
  PaymentInput,
  PaymentStatus,
  RenewalCandidate,
  SessionAdjustmentInput,
  SessionLedger,
} from "~/lib/api/types";

export function usePackageDefinitions() {
  return useQuery({
    queryKey: queryKeys.staff.packages(),
    queryFn: () => api.get<{ items: PackageDefinition[] }>("/staff/packages"),
    select: (data) => data.items,
    staleTime: 5 * 60_000,
  });
}

export function usePayments(from: string, to: string, status: string) {
  return useQuery({
    queryKey: queryKeys.staff.payments(from, to, status),
    queryFn: () =>
      api.get<{ items: Payment[] }>("/staff/payments", {
        searchParams: { from, to, status },
      }),
    select: (data) => data.items,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

/**
 * The ledger is the audit trail for a session balance. The balance shown
 * anywhere else in the product must equal the sum of these deltas — that is a
 * confirmed requirement, not a display convention (docs/BUSINESS_RULES.md).
 */
export function useSessionLedger(studentPackageId: string) {
  return useQuery({
    queryKey: queryKeys.staff.ledger(studentPackageId),
    queryFn: () => api.get<SessionLedger>(`/staff/ledger/${studentPackageId}`),
    staleTime: 30_000,
  });
}

/**
 * A manual adjustment moves a number the whole product reads, so this invalidates
 * more than its own screen: the roster row, the student's profile, the renewal
 * list and the dashboard all show a session balance.
 */
export function useAdjustSessions(studentPackageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SessionAdjustmentInput) =>
      api.post<SessionLedger>(`/staff/ledger/${studentPackageId}/adjustments`, input),
    async onSuccess(ledger) {
      queryClient.setQueryData(queryKeys.staff.ledger(studentPackageId), ledger);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff", "students"] }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.staff.student(ledger.studentId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.staff.renewals() }),
        queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] }),
      ]);
    },
  });
}

/**
 * Recording money. Never optimistic — a receipt that appears and then vanishes is
 * worse than one that takes a moment (docs/QUERY_CONVENTIONS.md).
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentInput) => api.post<Payment>("/staff/payments", input),
    async onSuccess(payment) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff", "payments"] }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.staff.student(payment.studentId),
        }),
        queryClient.invalidateQueries({ queryKey: ["staff", "report"] }),
      ]);
    },
  });
}

export function useSetPaymentStatus(paymentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: { status: PaymentStatus; voidReason?: string }) =>
      api.patch<Payment>(`/staff/payments/${paymentId}`, patch),
    async onSuccess(payment) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff", "payments"] }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.staff.student(payment.studentId),
        }),
        queryClient.invalidateQueries({ queryKey: ["staff", "report"] }),
      ]);
    },
  });
}

export function useRenewals() {
  return useQuery({
    queryKey: queryKeys.staff.renewals(),
    queryFn: () => api.get<{ items: RenewalCandidate[] }>("/staff/renewals"),
    select: (data) => data.items,
    staleTime: 60_000,
  });
}

export function useLogRenewalContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      studentId,
      followUpAt,
    }: {
      studentId: string;
      followUpAt: string | null;
    }) => api.patch<RenewalCandidate>(`/staff/renewals/${studentId}`, { followUpAt }),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: queryKeys.staff.renewals() });
    },
  });
}
