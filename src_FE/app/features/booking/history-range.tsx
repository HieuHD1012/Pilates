import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { useStudioToday } from "~/features/public/schedule-ui";
import { Figures } from "~/ui/figure";

/** Bound history to a selectable month; the API has date filters but no offset. */
export function historyMonthParams(month: string) {
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, number] = month.split("-").map(Number);
  const next =
    number === 12 ? `${year! + 1}-01` : `${year}-${String(number! + 1).padStart(2, "0")}`;
  return {
    starts_from: `${month}-01T00:00:00+07:00`,
    starts_to: `${next}-01T00:00:00+07:00`,
  };
}

/** "2026-10" moved by `delta` months, in the same "YYYY-MM" form. */
export function shiftMonth(month: string, delta: number): string {
  const [year, number] = month.split("-").map(Number);
  const index = year! * 12 + (number! - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function useHistoryMonth() {
  const today = useStudioToday();
  const [selected, setMonth] = useState<string | null>(null);
  const month = selected ?? today?.slice(0, 7) ?? "";
  return { month, setMonth, params: historyMonthParams(month) };
}

/**
 * History is read one month at a time, so the control steps through months.
 * A native `<input type="month">` printed the browser's own words ("October
 * 2026", in English on most machines) and offered future months that hold no
 * history; this one is Vietnamese and stops at the current month.
 */
export function HistoryMonthPicker({
  month,
  onChange,
  capped,
}: {
  month: string;
  onChange: (value: string) => void;
  capped: boolean;
}) {
  const today = useStudioToday();
  const current = today?.slice(0, 7) ?? null;
  const [year, number] = month ? month.split("-") : [];
  const atCurrent = current !== null && month >= current;

  const step =
    "border-rule-2 text-ink hover:border-ink grid size-11 place-items-center rounded-sm border bg-paper disabled:text-ink-3 disabled:cursor-not-allowed disabled:hover:border-rule-2";

  return (
    <div className="my-4">
      <div role="group" aria-label="Tháng xem lịch sử" className="flex items-center gap-2">
        <button
          type="button"
          className={step}
          aria-label="Tháng trước"
          disabled={!month}
          onClick={() => onChange(shiftMonth(month, -1))}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <p aria-live="polite" className="text-ink min-w-32 text-center text-sm font-medium">
          {month ? (
            <>
              Tháng <Figures>{`${Number(number)}/${year}`}</Figures>
            </>
          ) : (
            "Đang tải"
          )}
        </p>
        <button
          type="button"
          className={step}
          aria-label="Tháng sau"
          disabled={!month || atCurrent}
          onClick={() => onChange(shiftMonth(month, 1))}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      {capped ? (
        <p role="status" className="text-ink-2 mt-2 text-sm">
          Tháng này đạt giới hạn 500 bản ghi; danh sách có thể chưa đầy đủ. Liên hệ studio
          để kiểm tra.
        </p>
      ) : null}
    </div>
  );
}
