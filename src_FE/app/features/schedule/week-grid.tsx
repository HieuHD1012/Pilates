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
import { CapacityMeter, StatusBadge } from "~/ui/status";

// Sized so a 50-minute class clears three lines of chip content without
// truncating either the class name or the trainer's. P5: when a diacritic
// string does not fit, the container changes — never the string.
const PX_PER_MINUTE = 1.25;
const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 20;
const MIN_VISIBLE_HOURS = 8;

/**
 * The operational week.
 *
 * The hour ruler on the left is the same device as the public site's tick rule,
 * doing real work: a measured edge against which blocks are read. Class blocks
 * are ruled rectangles, not cards — square corners, a hairline, and a 2px left
 * edge that carries the one meaningful distinction (full vs available). Class
 * type is written, never signalled by colour alone.
 */
export interface WeekViewProps {
  days: string[];
  items: ClassSessionResponse[];
  today: string;
  onSelect: (item: ClassSessionResponse) => void;
  /**
   * `GET /classes` returns `trainer_id` and no name, so the name is joined in
   * by the screen from `GET /trainers`. A missing id still renders a chip —
   * the class is the fact, the name is the label on it.
   */
  trainerNames: Map<number, string>;
  /**
   * Seats taken per session, counted from `GET /bookings?held_only=true` over
   * the same week. Staff only: a trainer cannot read that endpoint, so their
   * week shows the capacity and no occupancy. Absent means "not measured" and
   * renders as capacity alone — never as 0 of 6, which would say the class is
   * empty when what we have is no measurement.
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

  const byDay = groupByDay(items);

  const hours = Array.from(
    { length: bounds.endHour - bounds.startHour + 1 },
    (_, index) => bounds.startHour + index,
  );

  return (
    <div className="rule-t overflow-x-auto">
      <div className="grid min-w-[68rem] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
        {/* Day headers */}
        <div className="rule-b bg-chalk sticky left-0 z-(--z-sticky)" />
        {days.map((day) => (
          <div
            key={day}
            className={cn(
              "rule-b rule-l px-2 py-2",
              day === today && "border-b-lacquer border-b-2",
            )}
          >
            <div className="flex items-baseline gap-1.5">
              <span className="text-ink-2 text-xs">
                {weekdayShort(`${day}T00:00:00+07:00`)}
              </span>
              <Figures className="text-ink text-xs">
                {formatDayMonth(`${day}T00:00:00+07:00`)}
              </Figures>
              {day === today ? (
                <span className="label-badge text-lacquer ml-auto">Hôm nay</span>
              ) : null}
            </div>
          </div>
        ))}

        {/* Hour ruler */}
        <div
          className="bg-chalk sticky left-0 z-(--z-sticky)"
          style={{ height: gridHeight }}
        >
          {hours.map((hour) => (
            <div key={hour} className="relative" style={{ height: 60 * PX_PER_MINUTE }}>
              <Figures className="text-2xs text-ink-2 absolute top-0.5 right-2">
                {String(hour).padStart(2, "0")}
              </Figures>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => (
          <div key={day} className="rule-l relative" style={{ height: gridHeight }}>
            {hours.map((hour) => (
              <div
                key={hour}
                aria-hidden="true"
                className="border-rule/60 absolute inset-x-0 border-t"
                style={{ top: (hour - bounds.startHour) * 60 * PX_PER_MINUTE }}
              />
            ))}

            {(byDay.get(day) ?? []).map((item) => {
              const offset =
                (hourOf(item.starts_at) * 60 +
                  minuteOf(item.starts_at) -
                  bounds.startHour * 60) *
                PX_PER_MINUTE;
              const height = Math.max(
                minutesBetween(item.starts_at, item.ends_at) * PX_PER_MINUTE,
                64,
              );
              const taken = seats?.get(item.id);
              const full = taken !== undefined && taken >= item.capacity;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  aria-pressed={selectedId === item.id}
                  className={cn(
                    "border-rule bg-paper absolute inset-x-1 overflow-hidden border border-l-2 px-2 py-1 text-left",
                    // Tight, explicit leading: three lines must fit a 50-minute block.
                    "leading-none",
                    "hover:border-ink-3 active:border-ink transition-colors duration-200",
                    full ? "border-l-danger" : "border-l-ink",
                    item.status === "CANCELLED" && "opacity-55",
                    selectedId === item.id && "border-ink ring-ink ring-1",
                  )}
                  style={{ top: offset, height }}
                >
                  {/* Capacity shares the time row so the trainer's name gets the
                      chip's full width — the widest Vietnamese name in a real
                      roster fits on one line at this column width. */}
                  <span className="flex items-baseline justify-between gap-1.5 leading-[1.15]">
                    <Figures className="text-2xs text-ink-2">
                      {formatTimeRange(item.starts_at, item.ends_at)}
                    </Figures>
                    <Figures className="text-2xs text-ink-2 shrink-0">
                      {taken === undefined ? item.capacity : `${taken}/${item.capacity}`}
                    </Figures>
                  </span>
                  <span className="text-ink mt-1 block text-xs leading-[1.15]">
                    {item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
                  </span>
                  <span className="text-2xs text-ink-2 mt-1 block leading-[1.15]">
                    {trainerNames.get(item.trainer_id) ?? `HLV #${item.trainer_id}`}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Below the desktop breakpoint the week becomes a list of ruled days. A studio
 * phone should not be asked to render a seven-column time grid.
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

  return (
    <div className="rule-t">
      {days.map((day) => {
        const dayItems = byDay.get(day) ?? [];
        return (
          <section
            key={day}
            className="rule-b grid gap-3 py-4 lg:grid-cols-[9rem_minmax(0,1fr)]"
          >
            <h3 className="flex items-baseline gap-2">
              <span className="text-ink text-sm">
                {weekdayShort(`${day}T00:00:00+07:00`)}
              </span>
              <Figures className="text-ink-2 text-xs">
                {formatDayMonth(`${day}T00:00:00+07:00`)}
              </Figures>
              {day === today ? (
                <span className="label-badge text-lacquer">Hôm nay</span>
              ) : null}
            </h3>

            {dayItems.length === 0 ? (
              <p className="text-ink-2 mt-2 text-xs">Không có lớp</p>
            ) : (
              <ul className="mt-2 lg:mt-0">
                {dayItems.map((item) => {
                  const taken = seats?.get(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(item)}
                        className="border-rule flex w-full items-center justify-between gap-3 border-t py-3 text-left"
                      >
                        <span className="min-w-0">
                          <Figures className="text-ink block text-xs">
                            {formatTimeRange(item.starts_at, item.ends_at)}
                          </Figures>
                          <span className="text-ink mt-0.5 block text-sm">
                            {item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
                          </span>
                          <span className="text-ink-2 mt-0.5 block text-xs">
                            {trainerNames.get(item.trainer_id) ?? `HLV #${item.trainer_id}`}
                          </span>
                        </span>
                        <span className="shrink-0">
                          {taken === undefined ? (
                            <Figures className="text-ink-2 text-xs">
                              {item.capacity} chỗ
                            </Figures>
                          ) : taken >= item.capacity ? (
                            <StatusBadge tone="critical">Đủ chỗ</StatusBadge>
                          ) : (
                            <CapacityMeter booked={taken} capacity={item.capacity} />
                          )}
                        </span>
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
