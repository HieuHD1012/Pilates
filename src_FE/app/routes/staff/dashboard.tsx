import { Link } from "react-router";

import { useStaffCalendar } from "~/features/schedule/use-staff-calendar";
import {
  addDays,
  formatDayMonth,
  formatTimeRange,
  studioDateKey,
  weekdayShort,
} from "~/lib/format";
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
 * There is no donut chart and there are no decorative KPI tiles. Every figure
 * here is either something a staff member acts on, or it is not on the screen.
 * Sections that depend on domains not yet built (leads, renewals, payments)
 * are deliberately absent rather than mocked into a convincing-looking chart.
 */
export default function StaffDashboard() {
  const today = studioDateKey(new Date());
  const query = useStaffCalendar({ from: today, to: addDays(today, 6), type: "all" });

  const items = query.data ?? [];
  const todayItems = items.filter((item) => studioDateKey(item.startsAt) === today);
  const attention = items.filter(
    (item) => item.bookedCount >= item.capacity && item.status === "scheduled",
  );
  const bookedToday = todayItems.reduce((sum, item) => sum + item.bookedCount, 0);
  const capacityToday = todayItems.reduce((sum, item) => sum + item.capacity, 0);

  return (
    <div className="gutter py-6">
      <PageHeader
        title="Tổng quan"
        description="Tình hình lớp học trong hôm nay và bảy ngày tới."
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
          description="Không tải được dữ liệu lớp học."
          detail={query.error instanceof Error ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess ? (
        <>
          <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Lớp hôm nay"
              value={<Figures display>{todayItems.length}</Figures>}
            />
            <Metric
              label="Lượt đăng ký hôm nay"
              value={
                <Figures display>
                  {bookedToday}/{capacityToday}
                </Figures>
              }
            />
            <Metric
              label="Lớp đủ chỗ · 7 ngày"
              value={<Figures display>{attention.length}</Figures>}
              tone={attention.length > 0 ? "attention" : "neutral"}
            />
            <Metric
              label="Lớp trong 7 ngày"
              value={<Figures display>{items.length}</Figures>}
            />
          </div>

          <section className="mt-12">
            <h2 className="text-ink text-sm font-medium">Cần chú ý</h2>
            <p className="measure-wide text-ink-2 mt-1 text-xs">
              Lớp đã đủ chỗ trong bảy ngày tới. Nếu có người chờ, cân nhắc mở thêm buổi hoặc
              xử lý danh sách chờ.
            </p>

            {attention.length === 0 ? (
              <EmptyState
                className="mt-4"
                title="Không có lớp nào đang đầy"
                description="Mọi lớp trong bảy ngày tới vẫn còn chỗ trống."
              />
            ) : (
              <ul className="rule-t mt-4">
                {attention.map((item) => (
                  <li
                    key={item.id}
                    className="rule-b grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3"
                  >
                    <span className="flex shrink-0 items-baseline gap-2">
                      {/* Over a seven-day window a time alone is ambiguous. */}
                      <span className="text-ink-2 w-13 text-xs">
                        {weekdayShort(item.startsAt)}{" "}
                        <Figures>{formatDayMonth(item.startsAt)}</Figures>
                      </span>
                      <Figures className="text-ink-2 text-xs">
                        {formatTimeRange(item.startsAt, item.endsAt)}
                      </Figures>
                    </span>
                    <span className="text-ink min-w-0 truncate text-sm">
                      {item.title}
                      <span className="text-ink-2 ml-2">{item.trainer.fullName}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      {item.waitlistCount > 0 ? (
                        <span className="text-ink-2 text-xs">
                          Chờ <Figures className="text-ink">{item.waitlistCount}</Figures>
                        </span>
                      ) : null}
                      <StatusBadge tone="attention">Đủ chỗ</StatusBadge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-12">
            <h2 className="text-ink text-sm font-medium">Lớp hôm nay</h2>
            {todayItems.length === 0 ? (
              <EmptyState
                className="mt-4"
                title="Hôm nay không có lớp"
                description="Không có buổi nào được xếp cho ngày hôm nay."
              />
            ) : (
              <ul className="rule-t mt-4">
                {todayItems.map((item) => (
                  <li
                    key={item.id}
                    className="rule-b grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3"
                  >
                    <Figures className="text-ink-2 text-xs">
                      {formatTimeRange(item.startsAt, item.endsAt)}
                    </Figures>
                    <span className="text-ink min-w-0 truncate text-sm">
                      {item.title}
                      <span className="text-ink-2 ml-2">
                        {item.type === "private" ? "Riêng" : "Nhóm"} ·{" "}
                        {item.trainer.fullName}
                      </span>
                    </span>
                    <CapacityMeter booked={item.bookedCount} capacity={item.capacity} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
