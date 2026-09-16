import { useState } from "react";
import { Link } from "react-router";

import { useBookableClasses, useStudentPackages } from "~/features/booking/queries";
import { eligibilityCopy, primaryReason } from "~/features/booking/eligibility-copy";
import type { ClassType } from "~/lib/api/types";
import { cn } from "~/lib/cn";
import {
  addDays,
  formatTimeRange,
  studioDateKey,
  weekdayLong,
  weekdayShort,
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
  const [activeDay, setActiveDay] = useState(today);
  const [type, setType] = useState<ClassType | "all">("all");

  const days = Array.from({ length: 14 }, (_, index) => addDays(today, index));
  const query = useBookableClasses({ from: today, to: addDays(today, 13), type });
  const packages = useStudentPackages();

  const activePackage = (packages.data ?? []).find((item) => item.status === "active");

  // Classes that have already started are removed rather than rendered as dead
  // rows: "chỉ hiển thị lớp có thể đăng ký" (bảng chức năng, Đăng ký/hủy/đổi).
  // Everything a student still could act on stays visible, including full
  // classes, so the reason is always readable.
  // Anchored to when the data was fetched, not to render time: a component
  // that re-reads the clock while rendering produces unstable output.
  const now = query.dataUpdatedAt || 0;
  const items = (query.data ?? [])
    .filter((item) => studioDateKey(item.startsAt) === activeDay)
    .filter((item) => new Date(item.startsAt).getTime() > now);

  return (
    <div className="gutter mx-auto max-w-(--container-column) py-5">
      <h1 className="text-ink text-xl font-medium">Lớp học</h1>

      <BalanceBanner
        pending={packages.isPending}
        remaining={activePackage?.sessionsRemaining ?? null}
        packageName={activePackage?.packageName ?? null}
        renewalDue={activePackage?.renewalDue ?? false}
      />

      <div
        className="rule-t mt-5 flex gap-1 overflow-x-auto py-3"
        role="tablist"
        aria-label="Chọn ngày"
      >
        {days.map((day) => {
          const selected = day === activeDay;
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveDay(day)}
              className={cn(
                "flex min-w-13 flex-col items-center gap-0.5 rounded-sm px-2 py-2 transition-colors",
                selected ? "bg-ink text-sand" : "text-ink-2 hover:bg-sand-deep",
              )}
            >
              <span className="text-2xs">{weekdayShort(`${day}T00:00:00+07:00`)}</span>
              <Figures className="text-sm">{day.slice(8)}</Figures>
            </button>
          );
        })}
      </div>

      <div
        className="rule-t flex items-center gap-1 py-3"
        role="group"
        aria-label="Lọc hình thức lớp"
      >
        {(
          [
            { value: "all", label: "Tất cả" },
            { value: "group", label: "Lớp nhóm" },
            { value: "private", label: "Lớp riêng" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={type === option.value}
            onClick={() => setType(option.value)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-xs transition-colors",
              type === option.value ? "bg-ink text-sand" : "text-ink-2 hover:bg-sand-deep",
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
          title={`Không có lớp vào ${weekdayLong(`${activeDay}T00:00:00+07:00`).toLowerCase()}`}
          description="Chọn một ngày khác, hoặc bỏ bộ lọc hình thức lớp để xem thêm."
        />
      ) : null}

      {query.isSuccess && items.length > 0 ? (
        <ul className="rule-t">
          {items.map((item) => {
            const reason = item.eligibility.canBook
              ? null
              : primaryReason(item.eligibility.reasons);
            const seatsLeft = Math.max(item.capacity - item.bookedCount, 0);

            return (
              <li key={item.id} className="rule-b">
                <Link
                  to={`/hv/lop-hoc/${item.id}`}
                  className="hover:bg-sand-deep/50 flex items-start justify-between gap-4 py-4 transition-colors"
                >
                  <span className="min-w-0">
                    <Figures className="text-ink block text-sm">
                      {formatTimeRange(item.startsAt, item.endsAt)}
                    </Figures>
                    <span className="text-ink mt-1 block text-base">{item.title}</span>
                    <span className="text-ink-2 mt-0.5 block text-xs">
                      {item.type === "private" ? "Lớp riêng" : "Lớp nhóm"} ·{" "}
                      {item.trainer.fullName}
                    </span>
                    {reason ? (
                      <span className="text-ink-2 mt-2 block text-xs">
                        {eligibilityCopy(reason).title}
                      </span>
                    ) : null}
                  </span>

                  <span className="flex shrink-0 flex-col items-end gap-2">
                    {item.eligibility.canBook ? (
                      <StatusBadge tone="positive">
                        Còn <Figures>{seatsLeft}</Figures> chỗ
                      </StatusBadge>
                    ) : item.eligibility.canJoinWaitlist ? (
                      <StatusBadge tone="attention">Chờ chỗ</StatusBadge>
                    ) : (
                      <StatusBadge tone="neutral">Không đặt được</StatusBadge>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function BalanceBanner({
  pending,
  remaining,
  packageName,
  renewalDue,
}: {
  pending: boolean;
  remaining: number | null;
  packageName: string | null;
  renewalDue: boolean;
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
      <p className="text-ink-2 text-xs">
        {packageName}
        {renewalDue ? (
          <span className="text-lacquer ml-2">Sắp hết — studio sẽ liên hệ</span>
        ) : null}
      </p>
    </div>
  );
}
