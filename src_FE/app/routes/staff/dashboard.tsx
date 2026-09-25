import { Link } from "react-router";

import { useDashboard } from "~/features/reports/queries";
import type { SessionRowResponse } from "~/lib/api/schema";
import { formatDayMonth, formatNumber, formatTime, weekdayShort } from "~/lib/format";
import { Button } from "~/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { CapacityMeter, StatusBadge } from "~/ui/status";

import type { Route } from "./+types/dashboard";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tổng quan — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The dashboard is a queue first, with today's classes immediately after it.
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
 * `detail_path` on each number is an **API** path, not a route. The queue links
 * to the studio screens that can act on renewal and payment counts.
 */

export default function StaffDashboard() {
  const query = useDashboard();

  return (
    <div className="gutter py-6">
      <PageHeader
        title="Tổng quan"
        description="Việc cần xử lý và những lớp diễn ra hôm nay."
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
          <section className="mt-6">
            <h2 className="text-ink text-lg font-medium">Việc cần xử lý</h2>
            <p className="text-ink-2 mt-1 text-sm">
              Mở đúng danh sách để tiếp tục công việc.
            </p>
            <ul className="rule-t mt-4">
              {query.data.sessions_needing_attention.map((session) => (
                <li key={session.class_session_id} className="rule-b">
                  <Link
                    to={`/studio/lich/${session.class_session_id}`}
                    className="hover:bg-sand-deep/50 grid gap-1 py-4 sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:gap-4"
                  >
                    <span className="text-ink-2 text-xs">
                      {weekdayShort(session.starts_at)}{" "}
                      <Figures>{formatDayMonth(session.starts_at)}</Figures> ·{" "}
                      <Figures>{formatTime(session.starts_at)}</Figures>
                    </span>
                    <span className="text-ink text-sm">
                      Nhắc điểm danh · {session.trainer_name}
                    </span>
                    <StatusBadge tone="attention">Chờ điểm danh</StatusBadge>
                  </Link>
                </li>
              ))}
              {query.data.numbers
                .filter(
                  (number) =>
                    (number.key === "renewals_due" ||
                      number.key === "unconfirmed_payments") &&
                    (number.value ?? 0) > 0,
                )
                .map((number) => (
                  <li key={number.key} className="rule-b">
                    <Link
                      to={
                        number.key === "renewals_due"
                          ? "/studio/gia-han"
                          : "/studio/thanh-toan"
                      }
                      className="hover:bg-sand-deep/50 flex items-center justify-between gap-4 py-4"
                    >
                      <span className="text-ink text-sm">{number.label}</span>
                      <span className="flex items-baseline gap-4">
                        <Figures className="text-ink text-xl">
                          {formatNumber(number.value ?? 0)}
                        </Figures>
                        <span aria-hidden="true">→</span>
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
            {query.data.sessions_needing_attention.length === 0 &&
            query.data.numbers.every(
              (number) =>
                (number.key !== "renewals_due" && number.key !== "unconfirmed_payments") ||
                (number.value ?? 0) === 0,
            ) ? (
              <p className="text-ink-2 py-4 text-sm">Không có việc nào đang chờ xử lý.</p>
            ) : null}
          </section>

          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-ink text-lg font-medium">Lịch hôm nay</h2>
              <p className="text-ink-2 text-xs">
                {query.data.numbers
                  .filter(
                    (number) =>
                      number.key === "sessions_today" || number.key === "bookings_today",
                  )
                  .map(
                    (number) =>
                      `${number.label}: ${number.value === null ? "—" : formatNumber(number.value)}`,
                  )
                  .join(" · ")}
              </p>
            </div>
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
