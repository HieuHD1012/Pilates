import type {
  AccountListParams,
  AnnouncementListParams,
  BookableParams,
  BookingListParams,
  ClassListParams,
  IsoDateTime,
  LeadListParams,
  MyScheduleParams,
  PackageTypeListParams,
  PaymentListParams,
  RenewalListParams,
  ReportPeriodParams,
  RevenueDetailParams,
  StudentListParams,
  StudentPackageListParams,
  TrainerListParams,
  TrainerStatsParams,
} from "./schema";

/**
 * THE query-key registry. Every key in the application is created here so that
 * invalidation is a compile-time-checked operation rather than a guess.
 *
 * Keys are named after the **backend resource**, not the screen that shows it,
 * because that is the unit a mutation invalidates. One booking touches the
 * student's schedule, the class it was made against and the package it was
 * charged to — three resources, whoever happens to be looking at them.
 *
 * `roots` are the prefixes to invalidate a whole family with; see
 * docs/QUERY_CONVENTIONS.md.
 */

export const queryKeys = {
  /** `GET /auth/me` — role, `student_id`, `trainer_id`. */
  session: () => ["session"] as const,

  pub: {
    schedule: (days?: number) => ["public", "schedule", { days }] as const,
    trainers: () => ["public", "trainers"] as const,
    packages: () => ["public", "packages"] as const,
    announcements: (limit?: number) => ["public", "announcements", { limit }] as const,
  },

  accounts: {
    list: (params: AccountListParams) => ["accounts", "list", params] as const,
    detail: (accountId: number) => ["accounts", "detail", accountId] as const,
  },

  leads: {
    list: (params: LeadListParams) => ["leads", "list", params] as const,
    detail: (leadId: number) => ["leads", "detail", leadId] as const,
  },

  students: {
    list: (params: StudentListParams) => ["students", "list", params] as const,
    detail: (studentId: number) => ["students", "detail", studentId] as const,
    overview: (studentId: number) => ["students", "overview", studentId] as const,
    photos: (studentId: number) => ["students", "photos", studentId] as const,
    photoFile: (studentId: number, photoId: number) =>
      ["students", "photos", studentId, "file", photoId] as const,
  },

  trainers: {
    list: (params: TrainerListParams) => ["trainers", "list", params] as const,
    detail: (trainerId: number) => ["trainers", "detail", trainerId] as const,
    photo: (trainerId: number) => ["trainers", "photo", trainerId] as const,
  },

  announcements: {
    list: (params: AnnouncementListParams) => ["announcements", "list", params] as const,
  },

  packages: {
    types: (params: PackageTypeListParams) => ["packages", "types", params] as const,
    ofStudent: (params: StudentPackageListParams) => ["packages", "list", params] as const,
    ledger: (packageId: number) => ["packages", "ledger", packageId] as const,
  },

  payments: {
    list: (params: PaymentListParams) => ["payments", "list", params] as const,
    detail: (paymentId: number) => ["payments", "detail", paymentId] as const,
  },

  classes: {
    list: (params: ClassListParams) => ["classes", "list", params] as const,
    /** The student's class list: sessions joined with what they can pay for. */
    bookableList: (params: ClassListParams) =>
      ["classes", "bookable-list", params] as const,
    detail: (sessionId: number) => ["classes", "detail", sessionId] as const,
    mine: (from?: IsoDateTime, to?: IsoDateTime) =>
      ["classes", "mine", { from, to }] as const,
    attendance: (sessionId: number) => ["classes", "attendance", sessionId] as const,
    trainerStats: (params: TrainerStatsParams) =>
      ["classes", "trainer-stats", params] as const,
  },

  bookings: {
    list: (params: BookingListParams) => ["bookings", "list", params] as const,
  },

  mySchedule: {
    list: (params: MyScheduleParams) => ["my-schedule", "list", params] as const,
    bookable: (params: BookableParams) => ["my-schedule", "bookable", params] as const,
  },

  renewals: {
    list: (params: RenewalListParams) => ["renewals", "list", params] as const,
    summary: () => ["renewals", "summary"] as const,
    history: (studentId: number) => ["renewals", "history", studentId] as const,
  },

  reports: {
    dashboard: () => ["reports", "dashboard"] as const,
    revenue: (params: ReportPeriodParams) => ["reports", "revenue", params] as const,
    revenueDetail: (params: RevenueDetailParams) =>
      ["reports", "revenue-detail", params] as const,
    classes: (params: ReportPeriodParams) => ["reports", "classes", params] as const,
    trainers: (params: ReportPeriodParams) => ["reports", "trainers", params] as const,
    classSizes: (params: ReportPeriodParams) =>
      ["reports", "trainer-class-sizes", params] as const,
    unconfirmed: (olderThanDays?: number) =>
      ["reports", "unconfirmed-payments", { olderThanDays }] as const,
  },
} as const;

/**
 * Family prefixes, for invalidating everything under a resource.
 *
 * A mutation should name the resources it moved, not the screens that show
 * them: `queryClient.invalidateQueries({ queryKey: roots.packages })`.
 */
export const roots = {
  session: ["session"],
  public: ["public"],
  accounts: ["accounts"],
  leads: ["leads"],
  students: ["students"],
  trainers: ["trainers"],
  announcements: ["announcements"],
  packages: ["packages"],
  payments: ["payments"],
  classes: ["classes"],
  bookings: ["bookings"],
  mySchedule: ["my-schedule"],
  renewals: ["renewals"],
  reports: ["reports"],
} as const satisfies Record<string, readonly string[]>;
