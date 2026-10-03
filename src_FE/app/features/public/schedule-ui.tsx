import { ChevronRight } from "lucide-react";
import { useSyncExternalStore } from "react";

import { CLASS_FORMATS } from "~/content/studio";
import type { PublicClassSession } from "~/lib/api/schema";
import { cn } from "~/lib/cn";
import {
  addDays,
  formatTime,
  minutesBetween,
  studioDateKey,
  weekdayLong,
  weekdayShort,
} from "~/lib/format";
import { Availability } from "~/ui/status";

/**
 * The public timetable, as a choice rather than a table (owner review,
 * 2026-10-03): pick a day from a strip that starts today, then scan one
 * vertical column of times grouped by part of the day. The structure is the
 * class-booking pattern every major studio app converges on; the type is ours.
 */

export const SCHEDULE_HORIZON_DAYS = 14;

const noSubscription = () => () => {};

/**
 * Today's studio date, or `null` during the pre-rendered pass and hydration.
 * The public pages are built ahead of time, so a date read at render would be
 * the build date; returning null there keeps the HTML and the first client
 * render identical, and the real date arrives on the next render.
 */
export function useStudioToday(): string | null {
  return useSyncExternalStore(
    noSubscription,
    () => studioDateKey(new Date()),
    () => null,
  );
}

/** A query-string value, read the same hydration-safe way. */
export function useSearchParam(name: string): string | null {
  return useSyncExternalStore(
    noSubscription,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}

export type FormatFilter = "ALL" | "GROUP" | "PRIVATE";

export function sessionKey(session: PublicClassSession): string {
  return `${session.starts_at}|${session.trainer_name}|${session.class_type}`;
}

export function formatName(type: PublicClassSession["class_type"]): string {
  return type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm";
}

export function formatRatio(type: PublicClassSession["class_type"]): string {
  const format = CLASS_FORMATS.find(
    (candidate) => candidate.id === (type === "PRIVATE" ? "private" : "group"),
  );
  return format?.ratio ?? "";
}

/** `00:00` boundaries of the three parts of a studio day. */
const PERIODS = [
  { id: "morning", label: "Sáng", range: "trước 11:00", until: 11 },
  { id: "midday", label: "Trưa", range: "11:00 – 15:00", until: 15 },
  { id: "evening", label: "Chiều tối", range: "sau 15:00", until: 24 },
] as const;

export function groupByPeriod(sessions: PublicClassSession[]) {
  return PERIODS.map((period, index) => {
    const from = index === 0 ? 0 : PERIODS[index - 1]!.until;
    return {
      ...period,
      sessions: sessions.filter((session) => {
        const hour = Number(formatTime(session.starts_at).slice(0, 2));
        return hour >= from && hour < period.until;
      }),
    };
  }).filter((period) => period.sessions.length > 0);
}

/** "3 tháng 10" — how a date is said, not how a table abbreviates it. */
export function spokenDate(dateKey: string): string {
  return `${Number(dateKey.slice(8))} tháng ${Number(dateKey.slice(5, 7))}`;
}

export function dayLabel(dateKey: string, today: string | null): string {
  const iso = `${dateKey}T00:00:00+07:00`;
  const prefix =
    dateKey === today
      ? "Hôm nay"
      : today && dateKey === addDays(today, 1)
        ? "Ngày mai"
        : weekdayLong(iso);
  return `${prefix}, ${spokenDate(dateKey)}`;
}

/* ── Day strip ─────────────────────────────────────────────────────────── */

export function DayStrip({
  days,
  active,
  today,
  counts,
  onSelect,
}: {
  days: string[];
  active: string;
  today: string;
  counts: Map<string, number>;
  onSelect: (day: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Chọn ngày"
      className="grid snap-x [scrollbar-width:none] auto-cols-[minmax(3.375rem,1fr)] grid-flow-col gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
    >
      {days.map((day) => {
        const iso = `${day}T00:00:00+07:00`;
        const count = counts.get(day) ?? 0;
        const selected = day === active;
        return (
          <button
            key={day}
            type="button"
            aria-pressed={selected}
            aria-label={`${dayLabel(day, today)}, ${count > 0 ? `${count} buổi` : "không có lớp"}`}
            onClick={() => onSelect(day)}
            className={cn(
              "flex min-h-20 snap-start flex-col items-center justify-center gap-1 rounded-sm border px-1 py-2.5",
              "ease-measure transition-colors duration-200",
              selected
                ? "border-ink bg-ink text-sand"
                : "border-rule bg-paper text-ink-2 hover:border-rule-2 hover:text-ink",
            )}
          >
            <span
              className={cn(
                "text-xs whitespace-nowrap",
                day === today && "text-[0.6875rem] tracking-tight",
                selected ? "text-sand/80" : day === today ? "text-copper" : "",
              )}
            >
              {day === today ? "Hôm nay" : weekdayShort(iso)}
            </span>
            <span
              className={cn(
                "figures text-[1.375rem] leading-none",
                selected ? "text-sand" : count > 0 ? "text-ink" : "text-ink-2",
              )}
            >
              {day.slice(8)}
            </span>
            <span aria-hidden="true" className="flex h-1.5 items-center gap-[3px]">
              {Array.from({ length: Math.min(count, 5) }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    "size-[5px] rounded-full",
                    selected ? "bg-amber" : "bg-copper-bright",
                  )}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Format filter ─────────────────────────────────────────────────────── */

const FILTERS: { value: FormatFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "GROUP", label: "Lớp nhóm" },
  { value: "PRIVATE", label: "Lớp riêng" },
];

export function FormatSwitch({
  value,
  onChange,
}: {
  value: FormatFilter;
  onChange: (value: FormatFilter) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Hình thức lớp"
      className="border-rule-2 bg-paper inline-flex rounded-sm border p-1"
    >
      {FILTERS.map((filter) => {
        const checked = filter.value === value;
        return (
          <button
            key={filter.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(filter.value)}
            className={cn(
              "ease-measure h-9 rounded-xs px-4 text-sm transition-colors duration-200",
              checked ? "bg-ink text-sand" : "text-ink-2 hover:text-ink",
            )}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── One session ───────────────────────────────────────────────────────── */

function SessionTime({
  session,
  size = "lg",
}: {
  session: PublicClassSession;
  size?: "lg" | "md";
}) {
  return (
    <span className="flex flex-col">
      <span
        className={cn(
          "figures-display text-ink leading-none",
          size === "lg" ? "text-[1.875rem]" : "text-[1.5rem]",
        )}
      >
        {formatTime(session.starts_at)}
      </span>
      <span className="figures text-ink-2 mt-1.5 text-xs">
        {minutesBetween(session.starts_at, session.ends_at)} phút
      </span>
    </span>
  );
}

function SessionWhat({ session }: { session: PublicClassSession }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-ink text-base font-medium">
        {formatName(session.class_type)}
        <span className="figures text-ink-2 ml-2 text-sm font-normal">
          {formatRatio(session.class_type)}
        </span>
      </span>
      <span className="text-ink-2 mt-0.5 truncate text-sm">{session.trainer_name}</span>
    </span>
  );
}

/** A selectable session on the timetable. */
export function SessionOption({
  session,
  selected,
  onSelect,
}: {
  session: PublicClassSession;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "group grid w-full grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-x-4 rounded-sm border px-4 py-4 text-left sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:px-5",
        "ease-measure transition-[background-color,border-color,box-shadow] duration-200",
        selected
          ? "border-copper bg-copper-wash/55 ring-copper ring-1"
          : session.is_full
            ? "border-rule border-dashed bg-transparent"
            : "border-rule bg-paper hover:border-rule-2 hover:bg-chalk",
      )}
    >
      <span className={cn(session.is_full && !selected && "opacity-60")}>
        <SessionTime session={session} />
      </span>
      <SessionWhat session={session} />
      <span className="flex items-center gap-3">
        <Availability isFull={session.is_full} />
        <ChevronRight
          aria-hidden="true"
          className={cn(
            "hidden size-4 shrink-0 transition-transform duration-200 sm:block",
            selected ? "text-copper" : "text-ink-3 group-hover:translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

/** A read-only session line, for the homepage preview. */
export function SessionLine({
  session,
  today,
}: {
  session: PublicClassSession;
  today: string | null;
}) {
  const day = studioDateKey(session.starts_at);
  const iso = `${day}T00:00:00+07:00`;
  return (
    <div className="rule-b grid grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-x-4 py-4 sm:grid-cols-[7rem_5rem_minmax(0,1fr)_auto]">
      <span className="text-ink-2 col-span-3 text-xs sm:col-span-1 sm:text-sm">
        {day === today ? "Hôm nay" : `${weekdayShort(iso)} · ${spokenDate(day)}`}
      </span>
      <SessionTime session={session} size="md" />
      <SessionWhat session={session} />
      <Availability isFull={session.is_full} />
    </div>
  );
}
