import { api } from "../client";
import type {
  ClassStatsResponse,
  DashboardResponse,
  ReportExportParams,
  ReportPeriodParams,
  RevenueDetailParams,
  RevenueRowResponse,
  RevenueSummaryResponse,
  TrainerClassSizeResponse,
  TrainerStatsResponse,
  UnconfirmedPaymentParams,
  UnconfirmedPaymentResponse,
} from "../schema";

/**
 * `docs/api/reports/` — read-only aggregates. The backend does the arithmetic,
 * including the parts that look trivial: `fill_rate` is `null` when no class
 * ran, and `detail_path` is a string to use as given, never to assemble.
 */
export const reportsApi = {
  /**
   * `GET /reports/dashboard` — four numbers, today's classes, and classes that
   * have ended without attendance. No revenue tile on purpose: this board sits
   * where customers can see the screen.
   */
  dashboard: () => api.get<DashboardResponse>("/reports/dashboard"),

  /** `GET /reports/revenue` — `CONFIRMED` payments only, by `confirmed_at`. */
  revenue: (params: ReportPeriodParams = {}) =>
    api.get<RevenueSummaryResponse>("/reports/revenue", { searchParams: params }),

  /** `GET /reports/revenue/detail` — the rows behind the number, same filters. */
  revenueDetail: (params: RevenueDetailParams = {}) =>
    api.get<RevenueRowResponse[]>("/reports/revenue/detail", { searchParams: params }),

  /** `GET /reports/classes` */
  classes: (params: ReportPeriodParams = {}) =>
    api.get<ClassStatsResponse>("/reports/classes", { searchParams: params }),

  /** `GET /reports/trainers` — sessions taught and attendances, per trainer. */
  trainers: (params: ReportPeriodParams = {}) =>
    api.get<TrainerStatsResponse[]>("/reports/trainers", { searchParams: params }),

  /**
   * `GET /reports/trainers/class-sizes` — how many classes of each size.
   * Row totals equal `scheduled_sessions` in the report above, same period.
   */
  trainerClassSizes: (params: ReportPeriodParams = {}) =>
    api.get<TrainerClassSizeResponse[]>("/reports/trainers/class-sizes", {
      searchParams: params,
    }),

  /** `GET /reports/trainers/export` — the screen's own query, as a file. */
  exportTrainers: (params: ReportExportParams = {}) =>
    api.blob("/reports/trainers/export", { searchParams: params }),

  /** `GET /reports/trainers/class-sizes/export` */
  exportTrainerClassSizes: (params: ReportExportParams = {}) =>
    api.blob("/reports/trainers/class-sizes/export", { searchParams: params }),

  /** `GET /reports/unconfirmed-payments` — credited packages whose money is late. */
  unconfirmedPayments: (params: UnconfirmedPaymentParams = {}) =>
    api.get<UnconfirmedPaymentResponse[]>("/reports/unconfirmed-payments", {
      searchParams: params,
    }),
};
