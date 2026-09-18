import { api } from "../client";
import type { BookableParams, MyScheduleItem, MyScheduleParams } from "../schema";

/** `docs/api/my-schedule/` — the student's own view, scoped in the query. */
export const myScheduleApi = {
  /**
   * `GET /my-schedule` — each row carries the consequence of cancelling right
   * now: `cancel_deadline`, `refund_if_cancelled_now`, `can_cancel`. Render
   * them; three rules combine into that boolean and a copy will drift.
   *
   * `student_id` is for staff reading a student's class-history tab.
   */
  list: (params: MyScheduleParams = {}) =>
    api.get<MyScheduleItem[]>("/my-schedule", { searchParams: params }),

  /**
   * `GET /my-schedule/bookable` — the ids a student can actually book with the
   * packages they hold. The class list shows these and nothing else; filtering
   * by package type in the UI is a second copy of the package-choosing rule.
   */
  bookable: (params: BookableParams = {}) =>
    api.get<number[]>("/my-schedule/bookable", { searchParams: params }),
};
