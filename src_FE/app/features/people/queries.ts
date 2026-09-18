import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  accountsApi,
  classesApi,
  progressPhotosApi,
  studentsApi,
  trainersApi,
} from "~/lib/api/endpoints";
import { queryKeys, roots } from "~/lib/api/query-keys";
import type {
  AccountCreateRequest,
  AccountListParams,
  AccountUpdateRequest,
  StudentCreateRequest,
  StudentListParams,
  StudentUpdateRequest,
  TrainerCreateRequest,
  TrainerListParams,
  TrainerStatsParams,
  TrainerUpdateRequest,
} from "~/lib/api/schema";

/* ── Students ───────────────────────────────────────────────────────────── */

export function useStudents(params: StudentListParams) {
  return useQuery({
    queryKey: queryKeys.students.list(params),
    queryFn: () => studentsApi.list(params),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useStudent(studentId: number | null) {
  return useQuery({
    queryKey: queryKeys.students.detail(studentId ?? 0),
    queryFn: () => studentsApi.get(studentId as number),
    enabled: studentId !== null,
    staleTime: 30_000,
  });
}

/**
 * Credits and active packages for one student.
 *
 * The credit figure is counted from the ledger and covers **active packages
 * only** — an expired package with unused credits is not confiscated, but it
 * does not appear here either.
 */
export function useStudentOverview(studentId: number | null) {
  return useQuery({
    queryKey: queryKeys.students.overview(studentId ?? 0),
    queryFn: () => studentsApi.overview(studentId as number),
    enabled: studentId !== null,
    staleTime: 30_000,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    // Phone is the studio's identity key; a duplicate answers 409
    // STUDENT_PHONE_TAKEN, which the form shows against the phone field.
    mutationFn: (input: StudentCreateRequest) => studentsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roots.students }),
  });
}

export function useUpdateStudent(studentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StudentUpdateRequest) => studentsApi.update(studentId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roots.students }),
  });
}

/* ── Progress photos ────────────────────────────────────────────────────── */

/**
 * **Hide this tab from STAFF entirely.** Showing it and catching the 403 tells
 * a receptionist that photographs of a student exist and that they are not
 * allowed to see them — which is itself the disclosure the rule prevents.
 */
export function useProgressPhotos(studentId: number | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.students.photos(studentId ?? 0),
    queryFn: () => progressPhotosApi.list(studentId as number),
    enabled: studentId !== null && enabled,
    staleTime: 60_000,
  });
}

/**
 * One photo's bytes, as an object URL.
 *
 * The image is not served from a static path: every read carries the token and
 * is re-authorised, so there is no `<img src>` to point at. The URL is revoked
 * when the query is garbage-collected.
 */
export function useProgressPhotoFile(studentId: number, photoId: number | null) {
  return useQuery({
    queryKey: queryKeys.students.photoFile(studentId, photoId ?? 0),
    async queryFn() {
      const blob = await progressPhotosApi.fileBlob(studentId, photoId as number);
      return URL.createObjectURL(blob);
    },
    enabled: photoId !== null,
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useUploadProgressPhoto(studentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, takenAt }: { file: File; takenAt?: string }) =>
      progressPhotosApi.upload(studentId, file, takenAt),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.students.photos(studentId) }),
  });
}

/** ADMIN only — deliberately narrower than the permission to look. */
export function useDeleteProgressPhoto(studentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: number) => progressPhotosApi.remove(studentId, photoId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.students.photos(studentId) }),
  });
}

/* ── Trainers ───────────────────────────────────────────────────────────── */

export function useTrainers(params: TrainerListParams = {}) {
  return useQuery({
    queryKey: queryKeys.trainers.list(params),
    queryFn: () => trainersApi.list(params),
    staleTime: 5 * 60_000,
  });
}

export function useTrainer(trainerId: number | null) {
  return useQuery({
    queryKey: queryKeys.trainers.detail(trainerId ?? 0),
    queryFn: () => trainersApi.get(trainerId as number),
    enabled: trainerId !== null,
    staleTime: 60_000,
  });
}

export function useCreateTrainer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TrainerCreateRequest) => trainersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roots.trainers }),
  });
}

/**
 * A trainer may edit their own bio. They cannot publish themselves to the
 * public site and cannot move the profile to another login — the backend
 * refuses both, whatever this form sends.
 */
export function useUpdateTrainer(trainerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TrainerUpdateRequest) => trainersApi.update(trainerId, input),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: roots.trainers });
      // A published-or-not change reaches the public roster too.
      await queryClient.invalidateQueries({ queryKey: roots.public });
    },
  });
}

/** 404 with code `NO_PHOTO` is the normal answer for a trainer without one. */
export function useTrainerPhoto(trainerId: number | null, hasPhoto: boolean) {
  return useQuery({
    queryKey: queryKeys.trainers.photo(trainerId ?? 0),
    async queryFn() {
      const blob = await trainersApi.photoBlob(trainerId as number);
      return URL.createObjectURL(blob);
    },
    enabled: trainerId !== null && hasPhoto,
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useUploadTrainerPhoto(trainerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => trainersApi.uploadPhoto(trainerId, file),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: roots.trainers });
      await queryClient.invalidateQueries({ queryKey: roots.public });
    },
  });
}

/**
 * One trainer's month. Counted by the same function the trainer report uses —
 * two screens saying "classes taught" must not run two different queries.
 */
export function useTrainerMonthStats(params: TrainerStatsParams | null) {
  return useQuery({
    queryKey: queryKeys.classes.trainerStats(
      params ?? { trainer_id: 0, year: 0, month: 0 },
    ),
    queryFn: () => classesApi.trainerStats(params as TrainerStatsParams),
    enabled: params !== null,
    staleTime: 5 * 60_000,
  });
}

/* ── Accounts ───────────────────────────────────────────────────────────── */

export function useAccounts(params: AccountListParams = {}) {
  return useQuery({
    queryKey: queryKeys.accounts.list(params),
    queryFn: () => accountsApi.list(params),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

/**
 * Creating a login.
 *
 * A `STUDENT` account must name the `student_id` of a profile that already
 * exists — the studio creates the person first and the login second. Omitting
 * `password` emails a set-your-own link instead, which is the normal path: the
 * studio does not choose anyone's password.
 */
export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AccountCreateRequest) => accountsApi.create(input),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: roots.accounts });
      // A new login may attach to a student or trainer profile, which then
      // reports a `user_id` it did not have a moment ago.
      await queryClient.invalidateQueries({ queryKey: roots.students });
      await queryClient.invalidateQueries({ queryKey: roots.trainers });
    },
  });
}

export function useUpdateAccount(accountId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AccountUpdateRequest) => accountsApi.update(accountId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roots.accounts }),
  });
}

/**
 * Locking revokes every open session as well as barring the next sign-in.
 * It is a separate endpoint rather than a field on the update: a screen that
 * sends `is_active: false`, gets a 200 and says "saved" while the account is
 * still open is the worst shape this could take.
 */
export function useSetAccountLocked(accountId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locked: boolean) =>
      locked ? accountsApi.lock(accountId) : accountsApi.unlock(accountId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roots.accounts }),
  });
}

/** Re-sends the set-your-password link. The token only ever travels by email. */
export function useSendPasswordReset(accountId: number) {
  return useMutation({
    mutationFn: () => accountsApi.sendPasswordReset(accountId),
  });
}
