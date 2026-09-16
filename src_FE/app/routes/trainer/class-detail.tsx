import { Link, useParams } from "react-router";

import { useClassRoster } from "~/features/roster/queries";
import type { BookingStatus, RosterEntry } from "~/lib/api/types";
import {
  formatDate,
  formatPhone,
  formatTimeRange,
  telHref,
  weekdayLong,
} from "~/lib/format";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Skeleton, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { QueryBoundary } from "~/ui/query-boundary";
import { CapacityMeter, StatusBadge, type StatusTone } from "~/ui/status";

import type { Route } from "./+types/class-detail";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Lớp của tôi — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

const STATUS: Record<BookingStatus, { tone: StatusTone; label: string }> = {
  booked: { tone: "neutral", label: "Đã đặt" },
  waitlisted: { tone: "info", label: "Chờ chỗ" },
  attended: { tone: "positive", label: "Đã tập" },
  cancelled: { tone: "critical", label: "Đã hủy" },
  no_show: { tone: "attention", label: "Không đến" },
};

/**
 * One class, and who is in it.
 *
 * Read-only by design. Booking status belongs to the backend (AGENTS.md rule 6)
 * and there is no attendance endpoint yet, so this screen ships no control that
 * cannot work — a check-box that silently does nothing is worse than a list.
 */
export default function TrainerClassDetail() {
  const { classId = "" } = useParams();
  const query = useClassRoster(classId, "trainer");

  return (
    <div className="gutter mx-auto max-w-(--container-column) py-5">
      <Link
        to="/hlv/lich-day"
        className="text-ink-2 decoration-rule-2 hover:text-ink text-xs underline underline-offset-[6px]"
      >
        Lịch dạy
      </Link>

      <div className="mt-4">
        <QueryBoundary
          query={query}
          // A roster with nobody in it is still a class the trainer teaches, so
          // the header must render; the empty list is stated in place below.
          isEmpty={() => false}
          loading={<RosterSkeleton />}
          errorDescription="Không mở được lớp này. Lớp có thể đã bị hủy hoặc đường dẫn không còn đúng."
        >
          {(roster) => {
            const session = roster.classSession;

            return (
              <>
                <header>
                  <p className="label-micro">
                    {weekdayLong(session.startsAt)} · {formatDate(session.startsAt)}
                  </p>
                  <Figures className="text-ink mt-2 block text-lg">
                    {formatTimeRange(session.startsAt, session.endsAt)}
                  </Figures>
                  <h1 className="text-ink mt-1 text-xl font-medium">{session.title}</h1>

                  <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                    <p className="text-ink-2 text-sm">
                      {session.type === "private" ? "Lớp riêng (1 kèm 1)" : "Lớp nhóm"}
                      {session.room ? ` · ${session.room}` : ""}
                    </p>
                    {session.status === "cancelled" ? (
                      <StatusBadge tone="critical">Đã hủy</StatusBadge>
                    ) : (
                      <CapacityMeter
                        booked={session.bookedCount}
                        capacity={session.capacity}
                      />
                    )}
                  </div>

                  {session.note ? (
                    <p className="rule-t text-ink-2 measure mt-4 pt-3 text-sm">
                      {session.note}
                    </p>
                  ) : null}
                </header>

                <DemoDataNotice className="mt-8" />

                <section className="mt-6">
                  <h2 className="flex items-baseline gap-2">
                    <span className="text-ink text-sm font-medium">Học viên</span>
                    <Figures className="text-ink-2 text-xs">{roster.booked.length}</Figures>
                  </h2>

                  {roster.booked.length === 0 ? (
                    <p className="rule-t text-ink-2 mt-3 py-8 text-sm">
                      Chưa có học viên nào đăng ký buổi này.
                    </p>
                  ) : (
                    <ul className="rule-t mt-3">
                      {roster.booked.map((entry) => (
                        <li
                          key={entry.bookingId}
                          className="rule-b flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 py-3"
                        >
                          <Person entry={entry} />
                          <StatusBadge tone={STATUS[entry.status].tone}>
                            {STATUS[entry.status].label}
                          </StatusBadge>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {roster.waitlist.length > 0 ? (
                  <section className="mt-8">
                    <h2 className="flex items-baseline gap-2">
                      <span className="text-ink text-sm font-medium">Danh sách chờ</span>
                      <Figures className="text-ink-2 text-xs">
                        {roster.waitlist.length}
                      </Figures>
                    </h2>

                    <ul className="rule-t mt-3">
                      {roster.waitlist.map((entry) => (
                        <li
                          key={entry.bookingId}
                          className="rule-b flex items-baseline gap-4 py-3"
                        >
                          {/* Queue order belongs to the backend; when it does not
                              send a position, none is shown rather than counted. */}
                          <span className="w-5 shrink-0">
                            {entry.waitlistPosition !== null ? (
                              <Figures className="text-ink-2 text-xs">
                                {entry.waitlistPosition}
                              </Figures>
                            ) : null}
                          </span>
                          <Person entry={entry} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <p className="rule-t text-ink-2 measure mt-8 pt-3 text-xs">
                  Điểm danh và trạng thái buổi tập do studio cập nhật; màn hình này chỉ để
                  xem danh sách.
                </p>
              </>
            );
          }}
        </QueryBoundary>
      </div>
    </div>
  );
}

/**
 * Name over phone. The name wraps — a trainer calling a student needs the whole
 * string, and a Vietnamese name clipped at a column edge is unusable (P5).
 */
function Person({ entry }: { entry: RosterEntry }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="text-ink block text-sm">{entry.fullName}</span>
      {entry.phone ? (
        <a
          href={telHref(entry.phone)}
          className="figures text-ink-2 decoration-rule-2 hover:text-lacquer hover:decoration-lacquer mt-0.5 block w-fit text-xs underline underline-offset-[5px]"
        >
          {formatPhone(entry.phone)}
        </a>
      ) : (
        <span className="text-ink-2 mt-0.5 block text-xs">Chưa có số điện thoại</span>
      )}
    </span>
  );
}

function RosterSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-3 h-4 w-28" />
      <Skeleton className="mt-3 h-5 w-56" />
      <SkeletonRows rows={4} className="mt-8" />
      <span className="sr-only">Đang tải danh sách lớp</span>
    </div>
  );
}
