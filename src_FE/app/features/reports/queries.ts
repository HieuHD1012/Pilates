import { useQuery } from "@tanstack/react-query";

import { api } from "~/lib/api/client";
import { queryKeys } from "~/lib/api/query-keys";
import type { ClassReport, RevenueReport, TrainerReport } from "~/lib/api/types";

/**
 * Reports are read-only aggregates. The backend does the arithmetic, including
 * "confirmed transactions only" — the frontend must never sum payments itself,
 * or two screens will disagree about revenue.
 */
export function useRevenueReport(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.staff.reportRevenue(from, to),
    queryFn: () =>
      api.get<RevenueReport>("/staff/reports/revenue", { searchParams: { from, to } }),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useClassReport(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.staff.reportClasses(from, to),
    queryFn: () =>
      api.get<ClassReport>("/staff/reports/classes", { searchParams: { from, to } }),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useTrainerReport(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.staff.reportTrainers(from, to),
    queryFn: () =>
      api.get<TrainerReport>("/staff/reports/trainers", { searchParams: { from, to } }),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}
