import { useState } from "react";
import { Link } from "react-router";

import { CANCELLATION_POLICY } from "~/content/studio";
import { usePublicSchedule } from "~/features/public/queries";
import {
  DayStrip,
  FormatSwitch,
  SCHEDULE_HORIZON_DAYS,
  SessionOption,
  dayLabel,
  formatName,
  formatRatio,
  groupByPeriod,
  sessionKey,
  useSearchParam,
  useStudioToday,
  type FormatFilter,
} from "~/features/public/schedule-ui";
import type { PublicClassSession } from "~/lib/api/schema";
import { addDays, formatTime, minutesBetween, studioDateKey } from "~/lib/format";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { ErrorState, RefreshingRule, Skeleton } from "~/ui/feedback";
import { Section } from "~/ui/layout";
import { PublicPageHeader } from "~/ui/public-page";
import { Availability } from "~/ui/status";

import type { Route } from "./+types/schedule";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Lịch tập — J Pilates Nha Trang" },
    {
      name: "description",
      content:
        "Lịch lớp Pilates reformer 14 ngày tới tại J Pilates Nha Trang. Lớp nhóm tối đa 3 người và lớp riêng, xem giờ và chỗ còn trống.",
    },
  ];
}

const LOGIN_TO_BOOK = "/dang-nhap?next=/hv/lop-hoc";

/**
 * PRE-RENDERED + HYDRATED.
 *
 * The document — heading, explanation, links — is real HTML on the CDN, so this
 * page is indexable. The timetable itself is mutable studio data and is owned
 * by TanStack Query at runtime. Those two facts must not be mixed: no timetable
 * row is ever baked into the build. See docs/DATA_OWNERSHIP.md.
 *
 * The page is a choice, not a table: a day strip that starts today (the public
 * endpoint only serves upcoming classes, so there is no past to page back to),
 * one column of times grouped by part of the day, and a summary of the chosen
 * session with the one next step that actually works for this visitor.
 */
export default function PublicSchedule() {
  const today = useStudioToday();
  const urlFormat = useSearchParam("loai");
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [pickedFormat, setPickedFormat] = useState<FormatFilter | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const format: FormatFilter =
    pickedFormat ??
    (urlFormat === "rieng" ? "PRIVATE" : urlFormat === "nhom" ? "GROUP" : "ALL");

  const start = today ?? "";
  const days = today
    ? Array.from({ length: SCHEDULE_HORIZON_DAYS }, (_, index) => addDays(today, index))
    : [];
  const query = usePublicSchedule(
    start,
    today ? addDays(today, SCHEDULE_HORIZON_DAYS - 1) : "",
  );

  const visible = (query.data ?? []).filter(
    (session) => format === "ALL" || session.class_type === format,
  );
  const byDay = new Map<string, PublicClassSession[]>();
  for (const session of visible) {
    const key = studioDateKey(session.starts_at);
    byDay.set(key, [...(byDay.get(key) ?? []), session]);
  }
  const counts = new Map([...byDay].map(([day, items]) => [day, items.length]));

  // Until the visitor picks a day, open on the first day that has a class —
  // landing on an empty "today" at 21:00 is a dead end with a full week behind it.
  const firstWithClasses = days.find((day) => (counts.get(day) ?? 0) > 0);
  const activeDay = pickedDay ?? firstWithClasses ?? today ?? "";
  const daySessions = byDay.get(activeDay) ?? [];
  const nextDayWithClasses = days.find(
    (day) => day > activeDay && (counts.get(day) ?? 0) > 0,
  );

  const selected = visible.find((session) => sessionKey(session) === selectedKey) ?? null;

  return (
    <>
      <PublicPageHeader
        label="Lịch tập"
        title={
          <>
            Chọn một buổi <em>hợp với bạn</em>.
          </>
        }
        lede="Chọn ngày và giờ phù hợp. Học viên đã có gói đăng nhập để đặt chỗ; nếu mới bắt đầu, hãy liên hệ J Pilates để được tư vấn."
      />

      <Section className={selected ? "pb-28 lg:pb-0" : undefined}>
        <div className="grid grid-cols-1 gap-y-12 pb-20 md:pb-28 lg:grid-cols-12 lg:gap-x-6">
          <div className="min-w-0 lg:col-span-8">
            <div className="rule-t flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-5">
              <FormatSwitch
                value={format}
                onChange={(value) => {
                  setPickedFormat(value);
                  setSelectedKey(null);
                }}
              />
              <p className="text-ink-2 text-sm">Giờ Nha Trang (GMT+7)</p>
            </div>

            {today ? (
              <DayStrip
                days={days}
                active={activeDay}
                today={today}
                counts={counts}
                onSelect={(day) => {
                  setPickedDay(day);
                  setSelectedKey(null);
                }}
              />
            ) : (
              <div aria-hidden="true" className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 7 }, (_, index) => (
                  <Skeleton key={index} className="h-20 rounded-sm" />
                ))}
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-ink text-[1.75rem] leading-tight font-light sm:text-[2rem]">
                {today ? dayLabel(activeDay, today) : "Đang tải lịch"}
              </h2>
              <DemoDataNotice />
            </div>
            <RefreshingRule active={query.isFetching && !query.isPending} />

            {/* Keyed by day: a new day replays a 150ms fade, so two days with the
                same timetable still read as a change. */}
            <div
              key={activeDay}
              className="mt-4 animate-[fade-in_150ms_var(--ease-measure)]"
            >
              {query.isPending || !today ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="h-[4.75rem] rounded-sm" />
                  ))}
                  <span className="sr-only">Đang tải lịch tập</span>
                </div>
              ) : null}

              {query.isError ? (
                <ErrorState
                  description="Chưa tải được lịch tập. Vui lòng thử lại, hoặc để lại số điện thoại để studio báo lịch cho bạn."
                  onRetry={() => void query.refetch()}
                />
              ) : null}

              {query.isSuccess && today && daySessions.length === 0 ? (
                <div className="rule-t py-10">
                  <p className="text-ink text-lg">Không có lớp trong ngày này.</p>
                  <p className="measure text-ink-2 mt-2 text-base">
                    {nextDayWithClasses
                      ? "Studio có lớp vào những ngày khác trong hai tuần tới."
                      : "Studio chưa mở lịch cho hai tuần tới. Để lại số điện thoại, studio sẽ báo bạn khi có lịch."}
                  </p>
                  <div className="mt-6">
                    {nextDayWithClasses ? (
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => setPickedDay(nextDayWithClasses)}
                      >
                        Xem {dayLabel(nextDayWithClasses, today).toLowerCase()}
                      </Button>
                    ) : (
                      <Button asChild variant="secondary" size="lg">
                        <Link to="/dat-tu-van?tu=lich-tap">Nhận tư vấn</Link>
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}

              {query.isSuccess && daySessions.length > 0
                ? groupByPeriod(daySessions).map((period) => (
                    <section
                      key={period.id}
                      aria-label={period.label}
                      className="rule-t grid gap-3 py-5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-6"
                    >
                      <h3 className="flex items-baseline gap-2 sm:flex-col sm:gap-1 sm:pt-3">
                        <span className="font-display text-ink text-xl font-light">
                          {period.label}
                        </span>
                        <span className="text-ink-2 text-xs">{period.range}</span>
                      </h3>
                      <ul className="flex flex-col gap-2">
                        {period.sessions.map((session) => {
                          const key = sessionKey(session);
                          return (
                            <li key={key}>
                              <SessionOption
                                session={session}
                                selected={key === selectedKey}
                                onSelect={() =>
                                  setSelectedKey(key === selectedKey ? null : key)
                                }
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))
                : null}
            </div>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
            <SelectedSession session={selected} />
            <div className="border-rule bg-paper rounded-sm border p-6 sm:p-7">
              <h2 className="font-display text-ink text-2xl font-light">
                Chưa có gói tập?
              </h2>
              <p className="text-ink-2 mt-2 text-base">
                Tài khoản đặt lớp do studio tạo khi bạn bắt đầu gói. Studio sẽ gọi để xếp
                buổi đầu tiên cùng bạn.
              </p>
              <Button asChild variant="copper" size="lg" fullWidth className="mt-5">
                <Link to="/dat-tu-van?tu=lich-tap">Nhờ studio xếp lớp</Link>
              </Button>
            </div>
          </aside>
        </div>
      </Section>

      {/* Phone: the chosen session follows the thumb. */}
      {selected ? (
        <div
          data-field="dark"
          className="bg-ink text-sand fixed inset-x-0 bottom-0 z-(--z-sticky) flex animate-[rise-in_220ms_var(--ease-measure)] items-center justify-between gap-4 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
        >
          <div className="min-w-0">
            <p className="figures-display text-[1.625rem] leading-none">
              {formatTime(selected.starts_at)}
            </p>
            <p className="text-sand/75 mt-1 text-xs">
              {formatName(selected.class_type)} · {selected.trainer_name}
            </p>
          </div>
          {selected.is_full ? (
            <Button asChild size="md" className="bg-sand text-ink hover:bg-paper">
              <Link to="/dat-tu-van?tu=lich-tap">Hỏi buổi khác</Link>
            </Button>
          ) : (
            <Button asChild size="md" className="bg-sand text-ink hover:bg-paper">
              <Link to={LOGIN_TO_BOOK}>Đăng nhập để đặt</Link>
            </Button>
          )}
        </div>
      ) : null}
    </>
  );
}

/**
 * What the visitor chose, and the honest next step. The public timetable has no
 * session id, so signing in cannot jump straight to this class — the panel says
 * so instead of letting the visitor discover it.
 */
function SelectedSession({ session }: { session: PublicClassSession | null }) {
  if (!session) {
    return (
      <div className="border-rule-2 hidden rounded-sm border border-dashed p-6 sm:p-7 lg:block">
        <p className="label-micro text-copper">Buổi bạn chọn</p>
        <p className="text-ink-2 mt-3 text-base">
          Chọn một buổi trong lịch để xem chi tiết và cách đặt chỗ.
        </p>
      </div>
    );
  }

  const isPrivate = session.class_type === "PRIVATE";
  const hours = CANCELLATION_POLICY[isPrivate ? "private" : "group"];
  const day = studioDateKey(session.starts_at);

  return (
    <div className="border-copper/40 bg-paper hidden rounded-sm border p-6 sm:p-7 lg:block">
      <p className="label-micro text-copper">Buổi bạn chọn</p>
      {/* A summary, not a form: the values explain themselves, so they are
          read as one block (when → what → who) instead of label-left /
          value-far-right pairs that make the eye zig-zag across the panel. */}
      <p className="text-ink mt-3 text-base">{dayLabel(day, null)}</p>
      <p className="mt-1 flex items-baseline gap-3">
        <span className="figures-display text-ink text-[2.75rem] leading-none">
          {formatTime(session.starts_at)}
        </span>
        <span className="figures text-ink-2 text-base">
          – {formatTime(session.ends_at)} ·{" "}
          {minutesBetween(session.starts_at, session.ends_at)} phút
        </span>
      </p>
      <p className="text-ink mt-4 text-base font-medium">
        {formatName(session.class_type)}{" "}
        <span className="figures text-ink-2 font-normal">
          {formatRatio(session.class_type)}
        </span>
      </p>
      <p className="text-ink-2 text-base">với {session.trainer_name}</p>
      <Availability isFull={session.is_full} className="mt-3" />

      {session.is_full ? (
        <>
          <p className="text-ink-2 mt-5 text-sm">
            Buổi này đã đủ người. Studio có thể xếp bạn vào một buổi gần nhất còn chỗ.
          </p>
          <Button asChild variant="secondary" size="lg" fullWidth className="mt-4">
            <Link to="/dat-tu-van?tu=lich-tap">Hỏi studio buổi khác</Link>
          </Button>
        </>
      ) : (
        <>
          <Button asChild size="lg" fullWidth className="mt-6">
            <Link to={LOGIN_TO_BOOK}>Đăng nhập để đặt buổi này</Link>
          </Button>
          <ul className="text-ink-2 mt-4 flex flex-col gap-1.5 text-sm">
            <li>Cần gói {isPrivate ? "lớp riêng" : "lớp nhóm"} còn buổi và còn hạn.</li>
            <li>Đặt thành công trừ 1 buổi; hủy trước {hours} giờ được hoàn buổi.</li>
            <li>Sau khi đăng nhập, bạn chọn lại buổi này trong mục Lớp học.</li>
          </ul>
        </>
      )}
    </div>
  );
}
