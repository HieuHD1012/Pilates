import { Link } from "react-router";

import { useDashboard } from "~/features/reports/queries";
import type { SessionRowResponse } from "~/lib/api/schema";
import { formatDayMonth, formatNumber, formatTime, weekdayShort } from "~/lib/format";
import { Button } from "~/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { Metric, PageHeader } from "~/ui/layout";
import { CapacityMeter, StatusBadge } from "~/ui/status";

import type { Route } from "./+types/dashboard";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tổng quan — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The dashboard answers one question: what needs attention today?
 *
 * The whole screen is `GET /reports/dashboard` — four numbers, today's classes,
 * and the classes that have ended without a trainer marking attendance. Two
 * properties of that endpoint are design decisions, not omissions:
 *
 *  - **There is no revenue figure.** This board is open all day at a counter
 *    customers can see. Money has its own screen, behind a sign-in and a click.
 *  - **A number may be `null`,** meaning not measured. The cell is then left
 *    empty; "0" would be a measurement, and a wrong one.
 *
 * `detail_path` on each number is an **API** path, not a route. The link below
 * is the studio screen that answers the same question, chosen by `key`; a
 * number whose screen does not exist yet is shown without a link rather than
 * pointing at a page that is not there.
 */

/** Dashboard number keys → the studio screen that shows those rows. */
const DETAIL_ROUTE: Record<string, string> = {
  sessions_today: "/studio/lich",
  bookings_today: "/studio/lich",
  renewals_due: "/studio/gia-han",
  unconfirmed_payments: "/studio/thanh-toan",
};

export default function StaffDashboard() {
  const query = useDashboard();

  return (
    <div className="gutter py-6">
      <PageHeader
        title="Tổng quan"
        description="Bốn con số của hôm nay, lịch trong ngày, và những lớp đã kết thúc còn chờ điểm danh."
        actions={
          <Button asChild size="sm" variant="secondary">
            <Link to="/studio/lich">Mở lịch tuần</Link>
          </Button>
        }
      />

      {query.isPending ? <SkeletonRows rows={5} className="mt-6" /> : null}

      {query.isError ? (
        <ErrorState
          className="mt-6"
          description="Không tải được bảng tổng quan."
          detail={query.error instanceof Error ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess ? (
        <>
          <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {query.data.numbers.map((number) => {
              const route = DETAIL_ROUTE[number.key];
              const value =
                number.value === null ? (
                  <Placeholder />
                ) : (
                  <Figures display>{formatNumber(number.value)}</Figures>
                );

              return (
                <Metric
                  key={number.key}
                  label={number.label}
                  value={route ? <Link to={route}>{value}</Link> : value}
                />
              );
            })}
          </div>

          <section className="mt-12">
            <h2 className="text-ink text-sm font-medium">Chờ điểm danh</h2>
            <p className="measure-wide text-ink-2 mt-1 text-xs">
              Lớp đã kết thúc mà huấn luyện viên chưa điểm danh. Chỉ huấn luyện viên phụ
              trách mới điểm danh được — nhắc họ mở lớp của mình.
            </p>

            {query.data.sessions_needing_attention.length === 0 ? (
              <EmptyState
                className="mt-4"
                title="Không có lớp nào chờ điểm danh"
                description="Mọi lớp đã kết thúc đều đã được điểm danh."
              />
            ) : (
              <ul className="rule-t mt-4">
                {query.data.sessions_needing_attention.map((session) => (
                  <SessionRow key={session.class_session_id} session={session} dated>
                    <StatusBadge tone="attention">Chờ điểm danh</StatusBadge>
                  </SessionRow>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-12">
            <h2 className="text-ink text-sm font-medium">Lớp hôm nay</h2>
            {query.data.sessions_today.length === 0 ? (
              <EmptyState
                className="mt-4"
                title="Hôm nay không có lớp"
                description="Không có buổi nào được xếp cho ngày hôm nay."
              />
            ) : (
              <ul className="rule-t mt-4">
                {query.data.sessions_today.map((session) => (
                  <SessionRow key={session.class_session_id} session={session}>
                    {session.status === "CANCELLED" ? (
                      <StatusBadge tone="critical">Đã hủy</StatusBadge>
                    ) : (
                      <CapacityMeter
                        booked={session.booked_count}
                        capacity={session.capacity}
                      />
                    )}
                  </SessionRow>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function SessionRow({
  session,
  dated,
  children,
}: {
  session: SessionRowResponse;
  /** Outside today's list a time alone is ambiguous, so the day comes with it. */
  dated?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="rule-b grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3">
      <span className="flex shrink-0 items-baseline gap-2">
        {dated ? (
          <span className="text-ink-2 w-13 text-xs">
            {weekdayShort(session.starts_at)}{" "}
            <Figures>{formatDayMonth(session.starts_at)}</Figures>
          </span>
        ) : null}
        <Figures className="text-ink-2 text-xs">{formatTime(session.starts_at)}</Figures>
      </span>
      <span className="text-ink min-w-0 text-sm">
        <Link
          to={`/studio/lich/${session.class_session_id}`}
          className="decoration-rule-2 underline-offset-[6px] hover:underline"
        >
          {session.trainer_name}
        </Link>
      </span>
      <span className="flex items-center gap-3">{children}</span>
    </li>
  );
}

/** A figure the backend did not measure. The dash is decoration, so it speaks. */
function Placeholder() {
  return (
    <>
      <span aria-hidden="true" className="text-ink-2">
        —
      </span>
      <span className="sr-only">chưa có số liệu</span>
    </>
  );
}
