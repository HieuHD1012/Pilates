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
 * `detail_path` on each number is an **API** path, not a route. Action counts
 * below link to the matching studio screens rather than that API path.
 */

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
        <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-10">
          <aside className="rule-t xl:border-rule pt-5 xl:col-start-2 xl:row-start-1 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8">
            <h2 className="text-ink text-base font-medium">Việc khác hôm nay</h2>
            <ul className="rule-t mt-3">
              {query.data.numbers
                .filter(
                  (number) =>
                    number.key === "renewals_due" || number.key === "unconfirmed_payments",
                )
                .map((number) => (
                  <li key={number.key} className="rule-b">
                    <Link
                      to={
                        number.key === "renewals_due"
                          ? "/studio/gia-han"
                          : "/studio/thanh-toan"
                      }
                      className="hover:bg-sand-deep/50 flex items-center justify-between gap-3 py-3"
                    >
                      <span className="text-ink text-sm">{number.label}</span>
                      <span className="figures text-ink text-xl">
                        {number.value === null ? (
                          <Placeholder />
                        ) : (
                          formatNumber(number.value)
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </aside>

          <div className="xl:col-start-1 xl:row-span-2 xl:row-start-1">
            <section>
              <h2 className="text-ink text-base font-medium">Chờ điểm danh</h2>
              <p className="measure-wide text-ink-2 mt-1 text-xs">
                Lớp đã kết thúc mà huấn luyện viên chưa điểm danh. Nhắc họ mở lớp của mình.
              </p>
              {query.data.sessions_needing_attention.length === 0 ? (
                <p className="rule-t text-ink-2 mt-4 py-4 text-sm">
                  Không có lớp nào chờ điểm danh.
                </p>
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

            <section className="mt-8">
              <h2 className="text-ink text-base font-medium">Lớp hôm nay</h2>
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
          </div>

          <section className="rule-t xl:border-rule pt-5 xl:col-start-2 xl:row-start-2 xl:border-t-0 xl:border-l xl:pl-8">
            <h3 className="text-ink text-sm font-medium">Tình hình hôm nay</h3>
            <div className="mt-3 grid grid-cols-2 gap-4 xl:grid-cols-1">
              {query.data.numbers
                .filter(
                  (number) =>
                    number.key !== "renewals_due" && number.key !== "unconfirmed_payments",
                )
                .map((number) => (
                  <Metric
                    key={number.key}
                    label={number.label}
                    value={
                      number.value === null ? (
                        <Placeholder />
                      ) : (
                        <Figures display>{formatNumber(number.value)}</Figures>
                      )
                    }
                  />
                ))}
            </div>
          </section>
        </div>
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
