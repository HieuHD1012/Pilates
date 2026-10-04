import type { QueryClient } from "@tanstack/react-query";

import { roots } from "./query-keys";

// Resource dependencies, shared by writes made from any role or screen.
// A balance affects both eligibility and the renewal queue. Attendance and
// cancellations also affect reports; public capacity is still API-owned.
const affected = {
  announcement: [roots.announcements, ["public", "announcements"]],
  booking: [
    roots.bookings,
    roots.classes,
    roots.mySchedule,
    roots.packages,
    roots.studentOverviews,
    roots.renewals,
    roots.reports,
    roots.publicSchedule,
  ],
  commerce: [
    roots.packages,
    roots.payments,
    roots.renewals,
    roots.reports,
    roots.studentOverviews,
    roots.classes,
    roots.mySchedule,
    roots.publicPackages,
  ],
  schedule: [
    roots.classes,
    roots.bookings,
    roots.mySchedule,
    roots.publicSchedule,
    roots.reports,
  ],
  attendance: [roots.classes, roots.bookings, roots.mySchedule, roots.reports],
  student: [roots.students, roots.bookingRosters],
  account: [roots.accounts, roots.students, roots.trainers, roots.session],
  profile: [
    roots.studentDetails,
    roots.studentLists,
    roots.studentDirectory,
    roots.studentOverviews,
    roots.trainers,
    roots.accounts,
    roots.classes,
    roots.mySchedule,
    roots.bookingRosters,
    roots.reports,
    roots.public,
  ],
} as const;

/** Return the promise so dependent reads finish before the write UI is released. */
export function invalidateChange(client: QueryClient, change: keyof typeof affected) {
  return Promise.all(
    affected[change].map((queryKey) => client.invalidateQueries({ queryKey })),
  );
}
