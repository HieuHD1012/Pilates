import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "~/lib/api/client";
import { queryKeys } from "~/lib/api/query-keys";
import type {
  AccountInput,
  AccountRow,
  LeadConversionInput,
  LeadConversionResult,
  StudentDetail,
  StudentInput,
  StudentSummary,
  TrainerDetail,
} from "~/lib/api/types";

export function useStudents(search: string, status: string) {
  return useQuery({
    queryKey: queryKeys.staff.students(search, status),
    queryFn: () =>
      api.get<{ items: StudentSummary[] }>("/staff/students", {
        searchParams: { search, status },
      }),
    select: (data) => data.items,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useStudentDetail(studentId: string) {
  return useQuery({
    queryKey: queryKeys.staff.student(studentId),
    queryFn: () => api.get<StudentDetail>(`/staff/students/${studentId}`),
    staleTime: 30_000,
  });
}

export function useTrainerDetail(trainerId: string) {
  return useQuery({
    queryKey: queryKeys.staff.trainer(trainerId),
    queryFn: () => api.get<TrainerDetail>(`/staff/trainers/${trainerId}`),
    staleTime: 60_000,
  });
}

export function useTrainerProfile() {
  return useQuery({
    queryKey: queryKeys.trainer.profile(),
    queryFn: () => api.get<TrainerDetail>("/trainer/profile"),
    staleTime: 5 * 60_000,
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.staff.accounts(),
    queryFn: () => api.get<{ items: AccountRow[] }>("/staff/accounts"),
    select: (data) => data.items,
    staleTime: 60_000,
  });
}

/**
 * Locking an account is an authorization change, so it is never optimistic —
 * the frontend showing a lock the backend refused would be the worst possible
 * outcome on this screen.
 */
export function useSetAccountStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "locked" }) =>
      api.patch<AccountRow>(`/staff/accounts/${id}`, { status }),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: queryKeys.staff.accounts() });
    },
  });
}

/**
 * Creating a student is the record everything else attaches to — a package, a
 * payment, a booking, a ledger entry. It is not optimistic: a duplicate phone
 * is a `409` the backend decides, and showing a profile the backend refused
 * would leave staff attaching sessions to a record that does not exist.
 */
export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StudentInput) => api.post<StudentSummary>("/staff/students", input),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ["staff", "students"] });
    },
  });
}

export function useUpdateStudent(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<StudentInput>) =>
      api.patch<StudentSummary>(`/staff/students/${studentId}`, input),
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.staff.student(studentId) }),
        queryClient.invalidateQueries({ queryKey: ["staff", "students"] }),
      ]);
    },
  });
}

/**
 * Converting keeps the consultation history and does not retype the data — both
 * halves are the confirmed requirement. The lead is not deleted; it becomes
 * `converted` and carries the new student's id, so the care history stays
 * readable from either side.
 */
export function useConvertLead(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadConversionInput) =>
      api.post<LeadConversionResult>(`/staff/leads/${leadId}/convert`, input),
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.staff.lead(leadId) }),
        queryClient.invalidateQueries({ queryKey: ["staff", "leads"] }),
        queryClient.invalidateQueries({ queryKey: ["staff", "students"] }),
      ]);
    },
  });
}

/**
 * Creating an account never sets a password — the backend invites, the person
 * chooses. So there is nothing here for the studio to hold on someone's behalf.
 */
export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AccountInput) => api.post<AccountRow>("/staff/accounts", input),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: queryKeys.staff.accounts() });
    },
  });
}
