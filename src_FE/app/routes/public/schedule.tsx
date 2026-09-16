import { useState } from "react";
import { Link } from "react-router";

import { usePublicSchedule } from "~/features/schedule/use-public-schedule";
import {
  addDays,
  formatDayMonth,
  formatTimeRange,
  startOfStudioWeek,
  studioDateKey,
  weekdayLong,
  weekdayShort,
} from "~/lib/format";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { EmptyState, ErrorState, RefreshingRule, SkeletonRows } from "~/ui/feedback";
import { Section } from "~/ui/layout";
import { StatusBadge } from "~/ui/status";
import { PublicPageHeader } from "~/ui/public-page";

import type { Route } from "./+types/schedule";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Lịch tập — Soul Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Lịch lớp Pilates reformer theo tuần tại Soul Pilates Nha Trang. Lớp nhóm nhỏ và lớp riêng, xem giờ và chỗ còn trống.",
    },
  ];
}

/**
 * PRE-RENDERED + HYDRATED.
 *
 * The document — heading, explanation, links — is real HTML on the CDN, so this
 * page is indexable. The timetable itself is mutable studio data and is owned
 * by TanStack Query at runtime. Those two facts must not be mixed: no timetable
 * row is ever baked into the build. See docs/DATA_OWNERSHIP.md.
 */
export default function PublicSchedule() {
  const [weekStart, setWeekStart] = useState(() => startOfStudioWeek(new Date()));
  const [activeDay, setActiveDay] = useState(() => studioDateKey(new Date()));

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const query = usePublicSchedule(weekStart, addDays(weekStart, 6));
  const today = studioDateKey(new Date());

  const byDay = new Map<string, NonNullable<typeof query.data>>();
  for (const item of query.data ?? []) {
    const key = studioDateKey(item.startsAt);
    const bucket = byDay.get(key) ?? [];
    bucket.push(item);
    byDay.set(key, bucket);
  }

  function shiftWeek(delta: number) {
    const next = addDays(weekStart, delta * 7);
    setWeekStart(next);
    setActiveDay(next);
  }

  return (
    <>
      <PublicPageHeader
        label="Lịch tập"
        title="Lịch lớp theo tuần."
        lede="Lớp còn chỗ được cập nhật liên tục. Học viên đã có gói tập đăng nhập để đặt chỗ trực tiếp."
        aside={
          <Button asChild variant="secondary" fullWidth>
            <Link to="/dang-nhap">Đăng nhập để đặt lớp</Link>
          </Button>
        }
      />

      <Section>
        <div className="pb-20 md:pb-28">
          <div className="flex items-center justify-between gap-4 py-5">
            <h2 className="text-ink-2 text-sm">
              Tuần {formatDayMonth(`${weekStart}T00:00:00+07:00`)} –{" "}
              {formatDayMonth(`${addDays(weekStart, 6)}T00:00:00+07:00`)}
            </h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => shiftWeek(-1)}>
                Tuần trước
              </Button>
              <Button size="sm" variant="secondary" onClick={() => shiftWeek(1)}>
                Tuần sau
              </Button>
            </div>
          </div>

          <DemoDataNotice className="mb-3" />
          <RefreshingRule active={query.isFetching && !query.isPending} />

          {/* Mobile: one day at a time. A seven-column grid squeezed onto a
              phone is a desktop calendar in disguise. */}
          <div className="md:hidden">
            <div
              role="tablist"
              aria-label="Chọn ngày"
              className="rule-b flex overflow-x-auto"
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
                      "flex min-w-14 flex-1 flex-col items-center gap-1 border-b-2 py-3",
                      selected
                        ? "border-lacquer text-ink"
                        : "text-ink-2 border-transparent",
                    )}
                  >
                    <span className="text-2xs">
                      {weekdayShort(`${day}T00:00:00+07:00`)}
                    </span>
                    <span className="figures text-sm">{day.slice(8)}</span>
                    {day === today ? (
                      <span aria-hidden="true" className="bg-lacquer size-1 rounded-full" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <DayList
              query={query}
              items={byDay.get(activeDay) ?? []}
              emptyLabel={weekdayLong(`${activeDay}T00:00:00+07:00`)}
            />
          </div>

          {/* Desktop: the whole week as ruled day blocks. */}
          <div className="hidden md:block">
            {query.isPending ? <SkeletonRows rows={6} /> : null}
            {query.isError ? (
              <ErrorState
                description="Chưa tải được lịch tập. Vui lòng thử lại hoặc liên hệ studio."
                onRetry={() => void query.refetch()}
              />
            ) : null}

            {query.isSuccess
              ? days.map((day) => {
                  const items = byDay.get(day) ?? [];
                  return (
                    <section key={day} className="rule-t grid grid-cols-12 gap-x-8 py-6">
                      <h3 className="col-span-3">
                        <span className="text-ink block text-base">
                          {weekdayLong(`${day}T00:00:00+07:00`)}
                        </span>
                        <span className="figures text-ink-2 mt-1 block text-xs">
                          {formatDayMonth(`${day}T00:00:00+07:00`)}
                        </span>
                        {day === today ? (
                          <span className="label-badge text-lacquer mt-2 inline-block">
                            Hôm nay
                          </span>
                        ) : null}
                      </h3>

                      <div className="col-span-9">
                        {items.length === 0 ? (
                          <p className="text-ink-2 py-2 text-sm">Không có lớp</p>
                        ) : (
                          <ul>
                            {items.map((item) => (
                              <li
                                key={item.id}
                                className="border-rule grid grid-cols-[8.5rem_1fr_auto] items-baseline gap-4 border-b py-3 last:border-b-0"
                              >
                                <span className="figures text-ink text-sm">
                                  {formatTimeRange(item.startsAt, item.endsAt)}
                                </span>
                                <span className="text-ink text-sm">
                                  {item.title}
                                  <span className="text-ink-2 ml-2">
                                    {item.type === "private" ? "Riêng" : "Nhóm"}
                                    {item.trainerName ? ` · ${item.trainerName}` : ""}
                                  </span>
                                </span>
                                <Availability value={item.availability} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </section>
                  );
                })
              : null}
          </div>
        </div>
      </Section>
    </>
  );
}

function DayList({
  query,
  items,
  emptyLabel,
}: {
  query: ReturnType<typeof usePublicSchedule>;
  items: NonNullable<ReturnType<typeof usePublicSchedule>["data"]>;
  emptyLabel: string;
}) {
  if (query.isPending) return <SkeletonRows rows={3} className="border-t-0" />;
  if (query.isError) {
    return (
      <ErrorState
        description="Chưa tải được lịch tập."
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        title={`Không có lớp vào ${emptyLabel.toLowerCase()}`}
        description="Chọn một ngày khác trong tuần, hoặc xem tuần kế tiếp."
        className="border-t-0"
      />
    );
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} className="rule-b py-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="figures text-ink text-sm">
              {formatTimeRange(item.startsAt, item.endsAt)}
            </span>
            <Availability value={item.availability} />
          </div>
          <p className="text-ink mt-1 text-sm">{item.title}</p>
          <p className="text-ink-2 mt-0.5 text-xs">
            {item.type === "private" ? "Lớp riêng" : "Lớp nhóm"}
            {item.trainerName ? ` · ${item.trainerName}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Availability({ value }: { value: "open" | "few_left" | "full" }) {
  if (value === "full") return <StatusBadge tone="critical">Hết chỗ</StatusBadge>;
  if (value === "few_left") return <StatusBadge tone="attention">Sắp đầy</StatusBadge>;
  return <StatusBadge tone="positive">Còn chỗ</StatusBadge>;
}
