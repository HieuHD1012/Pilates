import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ApiError, errorMessage } from "~/lib/api/client";
import { cn } from "~/lib/cn";
import type {
  ClassCreateRequest,
  ClassType,
  RecurrenceRequest,
  TrainerResponse,
} from "~/lib/api/schema";
import { addDays, formatDate } from "~/lib/format";
import { Button } from "~/ui/button";
import { Field, FormActions, Input, Select } from "~/ui/field";
import { Figures } from "~/ui/figure";

/**
 * Scheduling a class, one or a weekly pattern of them.
 *
 * Staff think in "thứ Ba, 6:30, 50 phút"; the API takes two instants. The two
 * are composed here with the studio's fixed `+07:00` — Vietnam keeps one offset
 * all year, so this is a formatting step, not a timezone calculation.
 *
 * A session has **no title, no room and no note**: it is a time, a trainer, a
 * type and a capacity. Fields for the other three used to exist here and wrote
 * to nothing.
 *
 * The rejection this form exists to handle is the trainer clash. The backend
 * refuses with `TRAINER_DOUBLE_BOOKED` and a sentence already written for the
 * person reading it, so that sentence is what gets shown.
 */

/** Common studio durations, plus whatever is already on the class being edited. */
const DURATIONS = [30, 45, 50, 60, 75, 90];

/**
 * ISO weekday order, Monday first, because that is how a Vietnamese studio week
 * is written and how the calendar grid above is laid out.
 */
const WEEKDAYS: Array<{ value: number; short: string; long: string }> = [
  { value: 1, short: "T2", long: "Thứ hai" },
  { value: 2, short: "T3", long: "Thứ ba" },
  { value: 3, short: "T4", long: "Thứ tư" },
  { value: 4, short: "T5", long: "Thứ năm" },
  { value: 5, short: "T6", long: "Thứ sáu" },
  { value: 6, short: "T7", long: "Thứ bảy" },
  { value: 7, short: "CN", long: "Chủ nhật" },
];

/** Not a studio rule — a guard. A pattern is a plan, not a permanent timetable. */
const MAX_HORIZON_DAYS = 26 * 7;

const schema = z.object({
  type: z.enum(["GROUP", "PRIVATE"]),
  trainerId: z.string().min(1, "Chọn huấn luyện viên"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Chọn ngày"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Chọn giờ bắt đầu"),
  durationMinutes: z
    .string()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 15, "Thời lượng tối thiểu 15 phút"),
  capacity: z
    .string()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1, "Sức chứa tối thiểu 1 người")
    .refine((v) => Number(v) <= 40, "Sức chứa vượt mức hợp lý"),
  /** Only read when the form is in recurring mode. */
  repeatUntil: z.string(),
});

export type ClassFormValues = z.input<typeof schema>;

/** The backend names its fields differently; map the ones a form can show. */
const FIELD_ALIASES: Record<string, keyof ClassFormValues> = {
  trainer_id: "trainerId",
  class_type: "type",
  capacity: "capacity",
  starts_at: "startTime",
  ends_at: "durationMinutes",
  start_time: "startTime",
  duration_minutes: "durationMinutes",
  start_date: "date",
  end_date: "repeatUntil",
};

/** The studio keeps one UTC offset all year, so this is formatting, not maths. */
const STUDIO_OFFSET = "+07:00";

function studioInstant(date: string, time: string): string {
  return `${date}T${time}:00${STUDIO_OFFSET}`;
}

/** "06:30" plus 50 minutes is "07:20". Wall clock only — no date arithmetic. */
function endOfDay(startTime: string, durationMinutes: number): string | null {
  if (!/^\d{2}:\d{2}$/.test(startTime)) return null;
  const [h = 0, m = 0] = startTime.split(":").map(Number);
  const total = h * 60 + m + durationMinutes;
  if (!Number.isFinite(total) || total >= 24 * 60) return null;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function ClassForm({
  trainers,
  defaultValues,
  submitLabel,
  bookedCount,
  recurring,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  trainers: TrainerResponse[];
  defaultValues?: Partial<ClassFormValues>;
  submitLabel: string;
  /** Editing a class people have already booked; shown so capacity is not a guess. */
  bookedCount?: number;
  /**
   * Adds the weekly-pattern fields and widens `onSubmit`. One form rather than
   * two because a repeating class is the same nine facts plus two — splitting it
   * would mean maintaining the clash-reporting and the end-time preview twice.
   */
  recurring?: boolean;
  pending: boolean;
  error: unknown;
  onSubmit: (input: ClassCreateRequest | RecurrenceRequest) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [weekdayError, setWeekdayError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setError,
  } = useForm<ClassFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: defaultValues?.type ?? "GROUP",
      trainerId: defaultValues?.trainerId ?? "",
      date: defaultValues?.date ?? "",
      startTime: defaultValues?.startTime ?? "",
      durationMinutes: defaultValues?.durationMinutes ?? "50",
      capacity: defaultValues?.capacity ?? "",
      repeatUntil: defaultValues?.repeatUntil ?? "",
    },
  });

  const startTime = String(useWatch({ control, name: "startTime" }) ?? "");
  const durationRaw = String(useWatch({ control, name: "durationMinutes" }) ?? "");
  const endTime = /^\d+$/.test(durationRaw)
    ? endOfDay(startTime, Number(durationRaw))
    : null;

  const dateField = String(useWatch({ control, name: "date" }) ?? "");
  const repeatUntil = String(useWatch({ control, name: "repeatUntil" }) ?? "");
  const horizonEnd = /^\d{4}-\d{2}-\d{2}$/.test(dateField)
    ? addDays(dateField, MAX_HORIZON_DAYS)
    : "";
  /**
   * How many buổi the pattern will try to create. A count, not a promise: any
   * occurrence that clashes with the trainer's calendar is skipped, and the
   * result lists which — the studio should not be surprised by either number.
   */
  const plannedCount =
    recurring &&
    weekdays.length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateField) &&
    /^\d{4}-\d{2}-\d{2}$/.test(repeatUntil) &&
    repeatUntil >= dateField
      ? countOccurrences(dateField, repeatUntil, weekdays)
      : null;

  const clash =
    error instanceof ApiError &&
    (error.code === "TRAINER_DOUBLE_BOOKED" || error.code === "RECURRENCE_CONFLICT");
  const otherFailure = error instanceof ApiError && !error.isValidation && !clash;

  // Only active trainers can be assigned new work; an inactive one already on the
  // class stays in the list so editing something else does not silently reassign.
  const assignable = trainers.filter(
    (trainer) => trainer.is_active || String(trainer.id) === defaultValues?.trainerId,
  );

  const durations = Array.from(
    new Set([
      ...DURATIONS,
      ...(durationRaw && /^\d+$/.test(durationRaw) ? [Number(durationRaw)] : []),
    ]),
  ).sort((a, b) => a - b);

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={handleSubmit((values) => {
        const parsed = schema.parse(values);
        if (recurring && weekdays.length === 0) {
          setWeekdayError("Chọn ít nhất một ngày trong tuần");
          return;
        }
        const duration = Number(parsed.durationMinutes);
        const endTimeOfDay = endOfDay(parsed.startTime, duration);
        if (endTimeOfDay === null) {
          setError("durationMinutes", { message: "Lớp phải kết thúc trong ngày" });
          return;
        }

        const payload: ClassCreateRequest | RecurrenceRequest = recurring
          ? {
              start_date: parsed.date,
              end_date: repeatUntil,
              weekdays: [...weekdays].sort((a, b) => a - b),
              start_time: `${parsed.startTime}:00`,
              duration_minutes: duration,
              trainer_id: Number(parsed.trainerId),
              class_type: parsed.type as ClassType,
              capacity: Number(parsed.capacity),
            }
          : {
              starts_at: studioInstant(parsed.date, parsed.startTime),
              ends_at: studioInstant(parsed.date, endTimeOfDay),
              trainer_id: Number(parsed.trainerId),
              class_type: parsed.type as ClassType,
              capacity: Number(parsed.capacity),
            };

        return onSubmit(payload).catch((cause) => {
          if (cause instanceof ApiError && cause.isValidation) {
            for (const [field, messages] of Object.entries(cause.fieldErrors)) {
              const target = FIELD_ALIASES[field];
              if (target !== undefined) {
                setError(target, { message: messages[0] ?? "Giá trị chưa hợp lệ" });
              }
            }
          }
        });
      })}
    >
      <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
        <Field label="Hình thức" required error={errors.type?.message}>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("type")}
            >
              <option value="GROUP">Lớp nhóm</option>
              <option value="PRIVATE">Lớp riêng</option>
            </Select>
          )}
        </Field>

        <Field label="Huấn luyện viên" required error={errors.trainerId?.message}>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("trainerId")}
            >
              <option value="">— Chọn huấn luyện viên —</option>
              {assignable.map((trainer) => (
                <option key={trainer.id} value={String(trainer.id)}>
                  {trainer.full_name}
                  {trainer.is_active ? "" : " (đã nghỉ)"}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {/* Two columns, not three: a native date input needs about 150px for
          dd/mm/yyyy plus its picker button, and a third of this dialog's width
          clipped the year. */}
      <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
        <Field label="Ngày" required error={errors.date?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="date"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("date")}
            />
          )}
        </Field>

        <Field label="Giờ bắt đầu" required error={errors.startTime?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="time"
              step={300}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("startTime")}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
        <Field label="Thời lượng" required error={errors.durationMinutes?.message}>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("durationMinutes")}
            >
              {durations.map((minutes) => (
                <option key={minutes} value={String(minutes)}>
                  {minutes} phút
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Sức chứa"
          required
          hint={
            bookedCount === undefined ? undefined : `Đã có ${bookedCount} người đăng ký.`
          }
          error={errors.capacity?.message}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              inputMode="numeric"
              autoComplete="off"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("capacity")}
            />
          )}
        </Field>
      </div>

      <p aria-live="polite" className="text-ink-2 text-xs">
        {endTime ? (
          <>
            Lớp kết thúc <Figures className="text-ink">{endTime}</Figures>
          </>
        ) : (
          " "
        )}
      </p>

      {recurring ? (
        <fieldset className="rule-t pt-4">
          <legend className="text-ink text-xs font-medium">Lặp hàng tuần</legend>

          <p className="text-ink-2 mt-2 text-xs">
            Buổi đầu là ngày đã chọn ở trên. Mẫu lặp vào các ngày dưới đây cho tới ngày kết
            thúc.
          </p>

          <div
            role="group"
            aria-label="Các thứ lặp lại"
            aria-describedby={weekdayError ? "weekday-error" : undefined}
            className="mt-3 flex flex-wrap gap-2"
          >
            {WEEKDAYS.map((day) => {
              const on = weekdays.includes(day.value);
              return (
                <label
                  key={day.value}
                  className={cn(
                    "border-rule-2 cursor-pointer rounded-xs border px-3 py-1.5 text-xs transition-colors",
                    // The real checkbox is sr-only, so its own focus ring is
                    // clipped away with it. Without this a keyboard user tabbing
                    // through the weekdays sees nothing move.
                    "has-[:focus-visible]:outline-lacquer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
                    on
                      ? "border-ink bg-ink text-sand"
                      : "text-ink hover:border-ink-3 bg-transparent",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    aria-label={day.long}
                    onChange={() => {
                      setWeekdayError(null);
                      setWeekdays((current) =>
                        current.includes(day.value)
                          ? current.filter((v) => v !== day.value)
                          : [...current, day.value],
                      );
                    }}
                  />
                  {day.short}
                </label>
              );
            })}
          </div>

          {weekdayError ? (
            <p id="weekday-error" className="text-danger mt-2 text-xs">
              {weekdayError}
            </p>
          ) : null}

          <div className="mt-4">
            <Field
              label="Lặp đến ngày"
              required
              hint={
                horizonEnd
                  ? `Tối đa 26 tuần, tới ${formatDate(`${horizonEnd}T00:00:00+07:00`)}.`
                  : "Tối đa 26 tuần."
              }
              error={errors.repeatUntil?.message}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="date"
                  min={dateField || undefined}
                  max={horizonEnd || undefined}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...register("repeatUntil")}
                />
              )}
            </Field>
          </div>

          <p aria-live="polite" className="text-ink-2 mt-3 text-xs">
            {plannedCount === null ? (
              " "
            ) : (
              <>
                Sẽ tạo tối đa <Figures className="text-ink">{plannedCount}</Figures> buổi.
                Bản xem trước ở bước sau cho biết buổi nào trùng lịch huấn luyện viên.
              </>
            )}
          </p>
        </fieldset>
      ) : null}

      {clash ? (
        <div role="alert" className="rule-t border-t-danger/40 pt-3">
          {/* The backend's sentence, which already names the problem in
              Vietnamese. Re-deriving copy from the code would say less. */}
          <p className="text-danger text-sm">
            {errorMessage(error, "Huấn luyện viên đã có lớp trong khoảng giờ này.")}
          </p>
          <p className="text-ink-2 mt-1.5 text-xs">
            Đổi giờ, hoặc chọn huấn luyện viên khác.
          </p>
        </div>
      ) : null}

      {otherFailure ? (
        <p role="alert" className="text-danger text-sm">
          Chưa lưu được lớp. Vui lòng thử lại sau ít phút.
        </p>
      ) : null}

      <FormActions>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" size="sm" pending={pending}>
          {submitLabel}
        </Button>
      </FormActions>
    </form>
  );
}

/** Mirrors the backend's walk so the count shown is the count attempted. */
function countOccurrences(from: string, until: string, weekdays: number[]): number {
  const wanted = new Set(weekdays);
  let count = 0;
  let cursor = from;
  for (let guard = 0; guard < 400 && cursor <= until; guard += 1) {
    const day = new Date(`${cursor}T00:00:00+07:00`).getUTCDay();
    if (wanted.has(day === 0 ? 7 : day)) count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}
