import type { ClassType } from "./types";

/**
 * THE query-key registry. Every key in the application is created here so that
 * invalidation is a compile-time-checked operation rather than a guess.
 * Adding a feature means adding a branch here — see docs/QUERY_CONVENTIONS.md.
 */

export interface ClassListFilters {
  from: string;
  to: string;
  type?: ClassType | "all";
  trainerId?: string | "all";
}

export const queryKeys = {
  session: () => ["session"] as const,

  publicSchedule: (from: string, to: string) => ["public", "schedule", from, to] as const,
  publicTrainers: () => ["public", "trainers"] as const,
  publicPromotions: () => ["public", "promotions"] as const,

  student: {
    all: () => ["student"] as const,
    classes: (filters: ClassListFilters) => ["student", "classes", filters] as const,
    class: (classId: string) => ["student", "class", classId] as const,
    bookings: (scope: "upcoming" | "history") => ["student", "bookings", scope] as const,
    profile: () => ["student", "profile"] as const,
    packages: () => ["student", "packages"] as const,
    ledger: (studentPackageId: string) => ["student", "ledger", studentPackageId] as const,
  },

  trainer: {
    all: () => ["trainer"] as const,
    schedule: (from: string, to: string) => ["trainer", "schedule", from, to] as const,
    roster: (classId: string) => ["trainer", "roster", classId] as const,
    profile: () => ["trainer", "profile"] as const,
  },

  staff: {
    all: () => ["staff"] as const,
    calendar: (filters: ClassListFilters) => ["staff", "calendar", filters] as const,
    classRoster: (classId: string) => ["staff", "class", classId, "roster"] as const,
    dashboard: (date: string) => ["staff", "dashboard", date] as const,

    students: (search: string, status: string) =>
      ["staff", "students", { search, status }] as const,
    student: (studentId: string) => ["staff", "student", studentId] as const,

    trainers: () => ["staff", "trainers"] as const,
    trainer: (trainerId: string) => ["staff", "trainer", trainerId] as const,

    leads: (status: string) => ["staff", "leads", { status }] as const,
    lead: (leadId: string) => ["staff", "lead", leadId] as const,

    packages: () => ["staff", "packages"] as const,
    payments: (from: string, to: string, status: string) =>
      ["staff", "payments", { from, to, status }] as const,
    ledger: (studentPackageId: string) => ["staff", "ledger", studentPackageId] as const,
    renewals: () => ["staff", "renewals"] as const,
    accounts: () => ["staff", "accounts"] as const,

    reportRevenue: (from: string, to: string) =>
      ["staff", "report", "revenue", { from, to }] as const,
    reportClasses: (from: string, to: string) =>
      ["staff", "report", "classes", { from, to }] as const,
    reportTrainers: (from: string, to: string) =>
      ["staff", "report", "trainers", { from, to }] as const,
  },
} as const;
