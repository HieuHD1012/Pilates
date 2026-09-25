import { useState } from "react";
import { Link } from "react-router";

import { useBookableClasses, useMySchedule } from "~/features/booking/queries";
import { useStudentPackages } from "~/features/commerce/queries";
import type { ClassType } from "~/lib/api/schema";
import { cn } from "~/lib/cn";
import {
  addDays,
  formatDate,
  formatTimeRange,
  studioDateKey,
  weekdayLong,
} from "~/lib/format";
import { Button } from "~/ui/button";
import { EmptyState, ErrorState, RefreshingRule, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { StatusBadge } from "~/ui/status";

import type { Route } from "./+types/classes";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Lớp học — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * REFERENCE C, part one — the mobile browse surface.
 *
 * The balance banner is at the top because it is the constraint on every
 * decision below it. Each row states its own availability in words, and rows
 * the student cannot book stay visible and legible rather than disappearing —
 * a class you cannot take is still information.
 */
export default function StudentClasses() {
  const today = studioDateKey(new Date());
  const [classType, setClassType] = useState<ClassType | "all">("all");
  const [onlyBookable, setOnlyBookable] = useState(true);
  const [showMoreDays, setShowMoreDays] = useState(false);

  const days = Array.from({ length: 14 }, (_, index) => addDays(today, index));
  const query = useBookableClasses({ from: today, to: addDays(today, 13), classType });
  const packages = useStudentPackages();

  /**
   * The seats this student already holds. `/my-schedule/bookable` leaves out a
   * class they are already in, which arrives here as `canBook: false` — the
   * same signal as "full" and as "your package does not cover this". Their own
   * booking is the one reason they can act on, so it gets its own badge.
   */
  const mySchedule = useMySchedule();
  const mine = new Set(
    (mySchedule.data ?? [])
      .filter((row) => row.booking_status === "BOOKED")
      .map((row) => row.class_session_id),
  );

  // The package a student is actually spending from: active, and with credits
  // left. The backend picks the one expiring soonest when a booking is made;
  // this banner only has to show a balance, so the first active one is enough.
  const activePackage = (packages.data ?? []).find((item) => item.status === "ACTIVE");

  // Classes that have already started are removed rather than rendered as dead
  // rows: "chỉ hiển thị lớp có thể đăng ký" (bảng chức năng, Đăng ký/hủy/đổi).
  // Everything a student still could act on stays visible, including full
  // classes, so the reason is always readable.
  // Anchored to when the data was fetched, not to render time: a component
  // that re-reads the clock while rendering produces unstable output.
  const now = query.dataUpdatedAt || 0;
  const upcoming = (query.data ?? [])
    .filter((item) => new Date(item.starts_at).getTime() > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const items = onlyBookable ? upcoming.filter((item) => item.canBook) : upcoming;
  const populatedDays = days.filter((day) =>
    items.some((item) => studioDateKey(item.starts_at) === day),
  );
  const visibleDays = showMoreDays ? populatedDays : populatedDays.slice(0, 4);

  return (
    <div className="gutter mx-auto max-w-(--container-column) py-5">
      <h1 className="text-ink text-xl font-medium">Lớp học</h1>

      <BalanceBanner
        pending={packages.isPending}
        remaining={activePackage?.balance_cached ?? null}
        packageName={activePackage?.name_snapshot ?? null}
        endDate={activePackage?.end_date ?? null}
      />

      <div
        className="rule-t mt-5 flex items-center gap-1 py-3"
        role="group"
        aria-label="Lọc hình thức lớp"
      >
        {(
          [
            { value: "all", label: "Tất cả" },
            { value: "GROUP", label: "Lớp nhóm" },
            { value: "PRIVATE", label: "Lớp riêng" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={classType === option.value}
            onClick={() => setClassType(option.value)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-xs transition-colors",
              classType === option.value
                ? "bg-ink text-sand"
                : "text-ink-2 hover:bg-sand-deep",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <RefreshingRule active={query.isFetching && !query.isPending} />

      {query.isPending ? <SkeletonRows rows={4} /> : null}

      {query.isError ? (
        <ErrorState
          description="Không tải được danh sách lớp. Kiểm tra kết nối rồi thử lại."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess && items.length === 0 ? (
        <EmptyState
          title={
            onlyBookable
              ? "Chưa có lớp đặt được trong 14 ngày tới"
              : "Chưa có lớp trong 14 ngày tới"
          }
          description={
            onlyBookable
              ? "Bạn có thể xem các lớp đã đặt hoặc chưa đủ điều kiện để đặt."
              : "Thử bỏ bộ lọc hình thức lớp hoặc quay lại sau khi studio mở lịch mới."
          }
          action={
            onlyBookable ? (
              <Button variant="secondary" onClick={() => setOnlyBookable(false)}>
                Xem tất cả lớp
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {query.isSuccess && items.length > 0 ? (
        <div className="mt-4">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="text-ink text-sm font-medium">
              {onlyBookable ? "Có thể đặt · 14 ngày" : "Tất cả lớp · 14 ngày"}
            </h2>
            <button
              type="button"
              onClick={() => setOnlyBookable((value) => !value)}
              className="text-ink-2 hover:text-ink shrink-0 text-xs underline underline-offset-4"
            >
              {onlyBookable ? "Xem tất cả" : "Chỉ lớp đặt được"}
            </button>
          </div>
          {visibleDays.map((day) => (
            <section key={day} className="rule-t py-4">
              <h3 className="text-ink mb-2 text-sm font-medium">
                {weekdayLong(`${day}T00:00:00+07:00`)} ·{" "}
                <Figures>{formatDate(`${day}T00:00:00+07:00`)}</Figures>
              </h3>
              <ul>
                {items
                  .filter((item) => studioDateKey(item.starts_at) === day)
                  .map((item) => {
                    /**
                     * `canBook` is the backend's answer from `/my-schedule/bookable`,
                     * and it is the whole answer: the reasons behind it are not
                     * published, so the row says what a student can do rather than
                     * guessing why. Seats left are not published to a student either.
                     */
                    return (
                      <li key={item.id} className="rule-b">
                        <Link
                          to={`/hv/lop-hoc/${item.id}`}
                          className="hover:bg-sand-deep/50 flex items-start justify-between gap-4 py-4 transition-colors"
                        >
                          <span className="min-w-0">
                            <Figures className="text-ink block text-sm">
                              {formatTimeRange(item.starts_at, item.ends_at)}
                            </Figures>
                            <span className="text-ink mt-1 block text-base">
                              {item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
                            </span>
                            <span className="text-ink-2 mt-0.5 block text-xs">
                              <Figures>{item.capacity}</Figures> chỗ
                            </span>
                          </span>

                          <span className="flex shrink-0 flex-col items-end gap-2">
                            {mine.has(item.id) ? (
                              <StatusBadge tone="positive">Đã đặt</StatusBadge>
                            ) : item.canBook ? (
                              <StatusBadge tone="positive">Đặt được</StatusBadge>
                            ) : (
                              <StatusBadge tone="neutral">Không đặt được</StatusBadge>
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </section>
          ))}
          {!showMoreDays && populatedDays.length > visibleDays.length ? (
            <Button
              variant="secondary"
              size="sm"
              className="mt-5"
              onClick={() => setShowMoreDays(true)}
            >
              Xem thêm ngày
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BalanceBanner({
  pending,
  remaining,
  packageName,
  endDate,
}: {
  pending: boolean;
  remaining: number | null;
  packageName: string | null;
  endDate: string | null;
}) {
  if (pending) {
    return (
      <div className="rule-t bg-rule/40 animate-skeleton mt-4 h-16 motion-reduce:animate-none" />
    );
  }

  if (remaining === null) {
    return (
      <div className="rule-t mt-4 flex flex-wrap items-center justify-between gap-3 py-4">
        <p className="text-ink-2 text-sm">Bạn chưa có gói tập đang hoạt động.</p>
        <Button asChild size="sm" variant="secondary">
          <Link to="/hv/goi-tap">Xem gói tập</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rule-t mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4">
      <p className="text-ink-2 flex items-baseline gap-2 text-sm">
        <span>Còn lại</span>
        <Figures display className="text-ink text-2xl">
          {remaining}
        </Figures>
        <span>buổi</span>
      </p>
      {/* No "renewal due" flag: whether a package needs renewing is a studio
          judgement, decided on the staff side by /renewals. A student sees the
          two facts it is made of — what is left and until when. */}
      <p className="text-ink-2 text-xs">
        {packageName}
        {endDate ? <span className="ml-2">đến {formatDate(endDate)}</span> : null}
      </p>
    </div>
  );
}
