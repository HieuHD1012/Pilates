import { useMutation, useQuery } from "@tanstack/react-query";

import { reportsApi } from "~/lib/api/endpoints";
import { queryKeys } from "~/lib/api/query-keys";
import type { ReportExportParams, ReportPeriodParams } from "~/lib/api/schema";
import { downloadBlob } from "~/lib/csv";

/**
 * Read-only aggregates. The backend does the arithmetic — including the parts
 * that look like they could be done here: `fill_rate` is `null` when no class
 * ran in the period, and `detail_path` is a route string to follow as given.
 */

/** Four numbers, today's classes, and classes that ended without attendance. */
export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.reports.dashboard(),
    queryFn: () => reportsApi.dashboard(),
    staleTime: 30_000,
  });
}

export function useRevenueReport(params: ReportPeriodParams) {
  return useQuery({
    queryKey: queryKeys.reports.revenue(params),
    queryFn: () => reportsApi.revenue(params),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

/** The rows behind the total — same period, same query, on the server. */
export function useRevenueDetail(params: ReportPeriodParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.reports.revenueDetail(params),
    queryFn: () => reportsApi.revenueDetail(params),
    enabled,
    staleTime: 60_000,
  });
}

export function useClassReport(params: ReportPeriodParams) {
  return useQuery({
    queryKey: queryKeys.reports.classes(params),
    queryFn: () => reportsApi.classes(params),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useTrainerReport(params: ReportPeriodParams) {
  return useQuery({
    queryKey: queryKeys.reports.trainers(params),
    queryFn: () => reportsApi.trainers(params),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

/**
 * Classes per trainer broken down by how many people were in them. Row totals
 * equal `scheduled_sessions` in the report above for the same period — the two
 * come from one query, so they cannot disagree.
 */
export function useTrainerClassSizes(params: ReportPeriodParams) {
  return useQuery({
    queryKey: queryKeys.reports.classSizes(params),
    queryFn: () => reportsApi.trainerClassSizes(params),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

/** Packages that were credited while the money is still unconfirmed. */
export function useUnconfirmedPayments(olderThanDays = 7) {
  return useQuery({
    queryKey: queryKeys.reports.unconfirmed(olderThanDays),
    queryFn: () => reportsApi.unconfirmedPayments({ older_than_days: olderThanDays }),
    staleTime: 60_000,
  });
}

export type ReportExport = "trainers" | "class-sizes";

/**
 * The export is produced by the **same query as the screen**, on the server,
 * with the same filters. Re-deriving the file from the rows already fetched
 * would produce a second answer that drifts from the first, and it would lose
 * whatever the period contains beyond the page on screen.
 */
export function useReportExport(report: ReportExport) {
  return useMutation({
    async mutationFn(params: ReportExportParams) {
      const blob =
        report === "trainers"
          ? await reportsApi.exportTrainers(params)
          : await reportsApi.exportTrainerClassSizes(params);
      const extension = params.format ?? "csv";
      const period = [params.period_start, params.period_end].filter(Boolean).join("_");
      downloadBlob(`bao-cao-${report}${period ? `-${period}` : ""}.${extension}`, blob);
    },
  });
}
