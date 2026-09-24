import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { packagesApi, paymentsApi, renewalsApi } from "~/lib/api/endpoints";
import { queryKeys, roots } from "~/lib/api/query-keys";
import type {
  AdjustCreditsRequest,
  PackageTypeCreateRequest,
  PackageTypeListParams,
  PackageTypeUpdateRequest,
  PaymentListParams,
  RecordPaymentRequest,
  RenewalContactRequest,
  RenewalListParams,
  RenewPackageRequest,
  SellPackageRequest,
  StudentPackageListParams,
} from "~/lib/api/schema";

/**
 * Money and credits.
 *
 * Two things share the word "package" and must not be confused: `/package-types`
 * is the catalogue the studio sells from, and `/packages` is what a student
 * bought — carrying `*_snapshot` fields frozen at the sale, so re-pricing the
 * catalogue tomorrow cannot rewrite last month's revenue.
 */

/* ── The catalogue ──────────────────────────────────────────────────────── */

export function usePackageTypes(params: PackageTypeListParams = {}) {
  return useQuery({
    queryKey: queryKeys.packages.types(params),
    queryFn: () => packagesApi.listTypes(params),
    staleTime: 5 * 60_000,
  });
}

export function useCreatePackageType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PackageTypeCreateRequest) => packagesApi.createType(input),
    onSuccess: () => invalidateCommerce(queryClient),
  });
}

/**
 * Editing a catalogue entry never touches packages already sold. Withdrawing
 * one from sale is `is_selling: false` — the row is never deleted, because the
 * packages people bought still point at it.
 */
export function useUpdatePackageType(packageTypeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PackageTypeUpdateRequest) =>
      packagesApi.updateType(packageTypeId, input),
    onSuccess: () => invalidateCommerce(queryClient),
  });
}

/* ── What a student holds ───────────────────────────────────────────────── */

/**
 * What a student holds.
 *
 * A signed-in student omits `student_id` and the backend pins the list to them.
 * **Staff must name one.** `GET /packages` with no `student_id` answers 404 —
 * credits belong to a package, and there is no studio-wide list of everyone's
 * remaining sessions. So a staff screen with no student chosen passes
 * `enabled: false` rather than firing a request whose only possible answer is
 * a refusal.
 */
export function useStudentPackages(
  params: StudentPackageListParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.packages.ofStudent(params),
    queryFn: () => packagesApi.list(params),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}

/**
 * One package's credit ledger.
 *
 * Render `balance_after` from each row. Adding up `delta` in the client is how
 * the screen and the database start disagreeing, and the ledger is the record
 * that settles arguments about money.
 */
export function usePackageLedger(packageId: number | null) {
  return useQuery({
    queryKey: queryKeys.packages.ledger(packageId ?? 0),
    queryFn: () => packagesApi.ledger(packageId as number),
    enabled: packageId !== null,
    staleTime: 30_000,
  });
}

/** Selling creates the package and credits it in one transaction. */
export function useSellPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SellPackageRequest) => packagesApi.sell(input),
    onSuccess: () => invalidateCommerce(queryClient),
  });
}

/** Renewal credits post as their own ledger entry, distinct from the sale. */
export function useRenewPackage(packageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RenewPackageRequest) => packagesApi.renew(packageId, input),
    onSuccess: () => invalidateCommerce(queryClient),
  });
}

/** ADMIN only, and the reason is required by a database constraint, not taste. */
export function useAdjustCredits(packageId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustCreditsRequest) => packagesApi.adjust(packageId, input),
    onSuccess: () => invalidateCommerce(queryClient),
  });
}

/* ── Payments ───────────────────────────────────────────────────────────── */

export function usePayments(params: PaymentListParams) {
  return useQuery({
    queryKey: queryKeys.payments.list(params),
    queryFn: () => paymentsApi.list(params),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function usePayment(paymentId: number | null) {
  return useQuery({
    queryKey: queryKeys.payments.detail(paymentId ?? 0),
    queryFn: () => paymentsApi.get(paymentId as number),
    enabled: paymentId !== null,
    staleTime: 30_000,
  });
}

/**
 * A payment belongs to a package, not to a person: `student_package_id` is
 * required. It lands as `PENDING`, and the credits are already there — they
 * were added when the package was sold, not by this record.
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordPaymentRequest) => paymentsApi.create(input),
    onSuccess: () => invalidateCommerce(queryClient),
  });
}

/** Only a `CONFIRMED` payment reaches the revenue report. */
export function useConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: number) => paymentsApi.confirm(paymentId),
    onSuccess: () => invalidateCommerce(queryClient),
  });
}

/**
 * Voiding is refused with 409 once the package has spent credits — the error
 * names how many, because the remedy is a manual credit adjustment by an
 * admin, not pressing the button again.
 */
export function useVoidPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: number; reason: string }) =>
      paymentsApi.void(paymentId, { reason }),
    onSuccess: () => invalidateCommerce(queryClient),
  });
}

/* ── Renewal reminders ──────────────────────────────────────────────────── */

/**
 * Filters here only **narrow** the default threshold — ≤6 credits or ≤15 days.
 * Nothing widens it, so two people with this screen open are always looking at
 * the same definition of "needs contact".
 */
export function useRenewals(params: RenewalListParams = {}) {
  return useQuery({
    queryKey: queryKeys.renewals.list(params),
    queryFn: () => renewalsApi.list(params),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

/** Head-count only. This board sits at a desk customers can see. */
export function useRenewalSummary() {
  return useQuery({
    queryKey: queryKeys.renewals.summary(),
    queryFn: () => renewalsApi.summary(),
    staleTime: 60_000,
  });
}

export function useRenewalHistory(studentId: number | null) {
  return useQuery({
    queryKey: queryKeys.renewals.history(studentId ?? 0),
    queryFn: () => renewalsApi.contactHistory(studentId as number),
    enabled: studentId !== null,
    staleTime: 60_000,
  });
}

/**
 * Recording a call. The history is append-only — an earlier attempt is never
 * edited, because "we called and they said no" and "we called again" are two
 * facts, not one corrected fact.
 *
 * There is no endpoint that sends anything: the Zalo button is a deep link and
 * staff write the message themselves.
 */
export function useLogRenewalContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RenewalContactRequest) => renewalsApi.logContact(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roots.renewals }),
  });
}

/**
 * Money and credits move together often enough that separating the
 * invalidations only produces screens that disagree: selling a package changes
 * a balance, a payment changes the revenue report, and both change who the
 * renewal list thinks needs a call.
 */
function invalidateCommerce(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: roots.packages }),
    queryClient.invalidateQueries({ queryKey: roots.payments }),
    queryClient.invalidateQueries({ queryKey: roots.renewals }),
    queryClient.invalidateQueries({ queryKey: roots.reports }),
    queryClient.invalidateQueries({ queryKey: roots.students }),
  ]);
}
