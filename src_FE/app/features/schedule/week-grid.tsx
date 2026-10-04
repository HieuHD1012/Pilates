import { ChevronRight } from "lucide-react";

import type { ClassSessionResponse } from "~/lib/api/schema";
import { cn } from "~/lib/cn";
import {
  formatDayMonth,
  formatTime,
  formatTimeRange,
  minutesBetween,
  studioDateKey,
  weekdayShort,
} from "~/lib/format";
import { Figures } from "~/ui/figure";

// Sized so a 50-minute class holds its three lines — time, format · trainer,
// seats — with the middle line free to wrap onto a second one. P5: when a
// diacritic string does not fit, the container changes, never the string, so
// a block grows past its slot (`minHeight`) rather than clipping the name.
const PX_PER_MINUTE = 1.6;
const MIN_BLOCK_HEIGHT = 72;
const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 20;
const MIN_VISIBLE_HOURS = 8;

/**
 * The operational week (docs/adr/0006-operational-workspace.md).
 *
 * The hour ruler on the left is a measured edge against which blocks are read.
 * A block is tinted by class type — the copper wash for a group class, the
 * cool wash for a private one — and its leading edge is a solid stripe in the
 * type's colour, the same stripe a row carries in the list and the calendar's
 * legend shows (`TYPE_STRIPE`). The type is still written inside it, so colour
 * is a second cue and never the only one. A class that has ended or been
 * cancelled recedes to an untinted block with a neutral stripe, and a cancelled
 * one says so in words. Today's column is tinted and carries a line at the
 * current time.
 */

/**
 * The stripe colour per state, shared by the grid, the list and the legend so
 * the key can never drift from what it explains.
 */
export const TYPE_STRIPE = {
  GROUP: "bg-copper-bright",
  PRIVATE: "bg-info/40",
  ENDED: "bg-rule-2",
} as const;
export interface WeekViewProps {
  days: string[];
  items: ClassSessionResponse[];
  today: string;
  onSelect: (item: ClassSessionResponse) => void;
  /**
   * `GET /classes` returns `trainer_id` and no name, so the name is joined in
   * by the screen from `GET /trainers`. A missing id still renders a block —
   * the class is the fact, the name is the label on it.
   */
  trainerNames: Map<number, string>;
  /**
   * Seats taken per session, counted from `GET /bookings?held_only=true` over
   * the same week. Staff only: a trainer cannot read that endpoint, so their
   * week shows the capacity and no occupancy. An absent map means "not
   * measured" and renders as capacity alone — never as 0 of 6, which would say
   * the class is empty when what we have is no measurement. Within a map that
   * is present, a class with no entry has no held booking: that is a 0.
   */
  seats?: Map<number, number>;
}

export function WeekGrid({
  days,
  items,
  today,
  onSelect,
  selectedId,
  trainerNames,
  seats,
}: WeekViewProps & { selectedId: number | null }) {
  const bounds = computeBounds(items);
  const totalMinutes = (bounds.endHour - bounds.startHour) * 60;
  const gridHeight = totalMinutes * PX_PER_MINUTE;
  const now = new Date();
  const nowMs = now.getTime();
  const nowOffset =
    (hourOf(now.toISOString()) * 60 + minuteOf(now.toISOString()) - bounds.startHour * 60) *
    PX_PER_MINUTE;
  const showNow = days.includes(today) && nowOffset >= 0 && nowOffset <= gridHeight;

  const byDay = groupByDay(items);

  const hours = Array.from(
    { length: bounds.endHour - bounds.startHour + 1 },
    (_, index) => bounds.startHour + index,
  );

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[56rem] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
        {/* Day headers */}
        <div className="rule-b bg-chalk sticky left-0 z-(--z-sticky)" />
        {days.map((day) => (
          <div
            key={day}
            className={cn(
              "rule-b rule-l bg-chalk flex items-baseline gap-2 px-3 py-3",
              day === today && "bg-copper-wash/40",
            )}
          >
            <span className={cn("text-xs", day === today ? "text-copper" : "text-ink-2")}>
              {weekdayShort(`${day}T00:00:00+07:00`)}
            </span>
            <Figures display className="text-ink text-xl leading-none">
              {day.slice(8, 10)}
            </Figures>
            {day === today ? (
              <span className="text-copper ml-auto text-xs font-medium">Hôm nay</span>
            ) : null}
          </div>
        ))}

        {/* Hour ruler */}
        <div
          className="bg-chalk sticky left-0 z-(--z-sticky)"
          style={{ height: gridHeight }}
        >
          {hours.map((hour) => (
            <div key={hour} className="relative" style={{ height: 60 * PX_PER_MINUTE }}>
              <Figures className="text-2xs text-ink-2 absolute top-1 right-2">
                {String(hour).padStart(2, "0")}:00
              </Figures>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const dayItems = byDay.get(day) ?? [];
          const lanes = assignLanes(dayItems);
          return (
            <div
              key={day}
              className={cn("rule-l relative", day === today && "bg-copper-wash/25")}
              style={{ height: gridHeight }}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  aria-hidden="true"
                  className="border-rule/70 absolute inset-x-0 border-t"
                  style={{ top: (hour - bounds.startHour) * 60 * PX_PER_MINUTE }}
                />
              ))}

              {day === today && showNow ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                  style={{ top: nowOffset }}
                >
                  <span className="bg-copper -ml-1 size-2 shrink-0 rounded-full" />
                  <span className="bg-copper h-px flex-1" />
                </div>
              ) : null}

              {dayItems.map((item) => {
                const offset =
                  (hourOf(item.starts_at) * 60 +
                    minuteOf(item.starts_at) -
                    bounds.startHour * 60) *
                  PX_PER_MINUTE;
                const height = Math.max(
                  minutesBetween(item.starts_at, item.ends_at) * PX_PER_MINUTE,
                  MIN_BLOCK_HEIGHT,
                );
                const lane = lanes.get(item.id) ?? { index: 0, count: 1 };
                const cancelled = item.status === "CANCELLED";
                const ended = new Date(item.ends_at).getTime() < nowMs;
                const trainer =
                  trainerNames.get(item.trainer_id) ?? `HLV #${item.trainer_id}`;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item)}
                    aria-pressed={selectedId === item.id}
                    className={cn(
                      "absolute flex flex-col items-start gap-1 overflow-hidden rounded-md border py-1.5 pr-2 pl-3 text-left",
                      "transition-colors duration-200 hover:z-10",
                      // Past and cancelled classes lose the tint rather than
                      // fading: opacity would take the small secondary text
                      // below contrast, and these are still read (attendance).
                      ended || cancelled
                        ? "bg-chalk border-rule-2 hover:border-ink-3"
                        : item.class_type === "PRIVATE"
                          ? "bg-info-wash border-info/25 hover:border-info"
                          : "bg-copper-wash/70 border-copper-bright/40 hover:border-copper",
                      selectedId === item.id && "border-ink ring-ink z-10 ring-1",
                    )}
                    style={{
                      top: offset,
                      minHeight: height,
                      left: `calc(${(lane.index / lane.count) * 100}% + 4px)`,
                      width: `calc(${100 / lane.count}% - 8px)`,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-y-0 left-0 w-1",
                        ended || cancelled
                          ? TYPE_STRIPE.ENDED
                          : TYPE_STRIPE[item.class_type],
                      )}
                    />
                    <Figures className="text-ink text-xs leading-tight font-medium">
                      {formatTimeRange(item.starts_at, item.ends_at)}
                    </Figures>
                    <span className="text-ink-2 text-xs leading-snug">
                      <span className="text-ink">
                        {item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
                      </span>
                      {" · "}
                      {trainer}
                    </span>
                    <SeatLine
                      item={item}
                      seats={seats}
                      className="text-2xs leading-tight"
                    />
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Below the wide breakpoint the week becomes a list of days. A studio phone
 * should not be asked to render a seven-column time grid.
 */
export function WeekList({
  days,
  items,
  today,
  onSelect,
  trainerNames,
  seats,
}: WeekViewProps) {
  const byDay = groupByDay(items);
  const nowMs = new Date().getTime();

  return (
    <div>
      {days.map((day) => {
        const dayItems = [...(byDay.get(day) ?? [])].sort((a, b) =>
          a.starts_at.localeCompare(b.starts_at),
        );
        return (
          <section
            key={day}
            className={cn("rule-b last:border-b-0", day === today && "bg-copper-wash/25")}
          >
            <h3 className="flex items-baseline gap-2 px-4 pt-4 pb-2">
              <span className={cn("text-sm", day === today ? "text-copper" : "text-ink")}>
                {weekdayShort(`${day}T00:00:00+07:00`)}
              </span>
              <Figures className="text-ink-2 text-xs">
                {formatDayMonth(`${day}T00:00:00+07:00`)}
              </Figures>
              {day === today ? (
                <span className="text-copper text-xs font-medium">Hôm nay</span>
              ) : null}
            </h3>

            {dayItems.length === 0 ? (
              <p className="text-ink-2 px-4 pb-4 text-xs">Không có lớp</p>
            ) : (
              <ul className="pb-2">
                {dayItems.map((item) => {
                  const ended =
                    item.status === "CANCELLED" || new Date(item.ends_at).getTime() < nowMs;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(item)}
                        className={cn(
                          "hover:bg-sand-deep/50 flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "w-1 self-stretch rounded-full",
                            ended ? TYPE_STRIPE.ENDED : TYPE_STRIPE[item.class_type],
                          )}
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <Figures className="text-ink text-sm">
                            {formatTimeRange(item.starts_at, item.ends_at)}
                          </Figures>
                          <span className="text-ink-2 text-xs">
                            <span className="text-ink">
                              {item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
                            </span>
                            {" · "}
                            {trainerNames.get(item.trainer_id) ?? `HLV #${item.trainer_id}`}
                          </span>
                          <SeatLine item={item} seats={seats} className="text-xs" />
                        </span>
                        <ChevronRight
                          className="text-ink-2 size-4 shrink-0"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * Seats as words and a fraction. The fraction stays in every measured state,
 * full included: it is the number people act on, and "Đủ chỗ" beside it says
 * why the class will refuse the next booking.
 */
function SeatLine({
  item,
  seats,
  className,
}: {
  item: ClassSessionResponse;
  seats: Map<number, number> | undefined;
  className?: string;
}) {
  if (item.status === "CANCELLED") {
    return <span className={cn("text-danger font-medium", className)}>Đã hủy</span>;
  }
  const taken = seats === undefined ? undefined : (seats.get(item.id) ?? 0);
  if (taken === undefined) {
    return (
      <span className={cn("text-ink-2", className)}>
        <Figures>{item.capacity}</Figures> chỗ
      </span>
    );
  }
  const full = taken >= item.capacity;
  return (
    <span className={cn(full ? "text-ink font-medium" : "text-ink-2", className)}>
      <Figures>
        {taken}/{item.capacity}
      </Figures>{" "}
      {full ? "· Đủ chỗ" : "chỗ"}
    </span>
  );
}

function groupByDay(items: ClassSessionResponse[]): Map<string, ClassSessionResponse[]> {
  const byDay = new Map<string, ClassSessionResponse[]>();
  for (const item of items) {
    const key = studioDateKey(item.starts_at);
    const bucket = byDay.get(key) ?? [];
    bucket.push(item);
    byDay.set(key, bucket);
  }
  return byDay;
}

/**
 * Side-by-side lanes for classes that overlap on one day. Two trainers teaching
 * at 07:00 is an ordinary studio morning; drawn at full width, one block would
 * sit exactly on top of the other and the second class would vanish.
 */
function assignLanes(
  items: ClassSessionResponse[],
): Map<number, { index: number; count: number }> {
  const sorted = [...items].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const result = new Map<number, { index: number; count: number }>();
  let cluster: ClassSessionResponse[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;

  const close = () => {
    for (const item of cluster) {
      const entry = result.get(item.id);
      if (entry) entry.count = laneEnds.length;
    }
    cluster = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    const start = new Date(item.starts_at).getTime();
    const end = new Date(item.ends_at).getTime();
    if (start >= clusterEnd) close();
    let index = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (index === -1) {
      index = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[index] = end;
    }
    result.set(item.id, { index, count: 1 });
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, end);
  }
  close();
  return result;
}

function hourOf(iso: string): number {
  return Number(formatTime(iso).slice(0, 2));
}

function minuteOf(iso: string): number {
  return Number(formatTime(iso).slice(3, 5));
}

/**
 * The ruler spans the hours the studio actually uses this week, not a fixed
 * 06–20 working day. A calendar that renders six empty midday hours every week
 * trains people to scroll past their own schedule.
 */
function computeBounds(items: ClassSessionResponse[]): {
  startHour: number;
  endHour: number;
} {
  if (items.length === 0) {
    return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
  }
  let min = 23;
  let max = 0;
  for (const item of items) {
    min = Math.min(min, hourOf(item.starts_at));
    max = Math.max(max, hourOf(item.ends_at) + (minuteOf(item.ends_at) > 0 ? 1 : 0));
  }
  const startHour = Math.max(0, min);
  const endHour = Math.min(24, Math.max(max, startHour + MIN_VISIBLE_HOURS));
  return { startHour, endHour };
}
