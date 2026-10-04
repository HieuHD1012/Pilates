import { useState } from "react";

import { useStudioToday } from "~/features/public/schedule-ui";
import { Field, Input } from "~/ui/field";

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

export function useHistoryMonth() {
  const today = useStudioToday();
  const [selected, setMonth] = useState<string | null>(null);
  const month = selected ?? today?.slice(0, 7) ?? "";
  return { month, setMonth, params: historyMonthParams(month) };
}

export function HistoryMonthPicker({
  month,
  onChange,
  capped,
}: {
  month: string;
  onChange: (value: string) => void;
  capped: boolean;
}) {
  return (
    <div className="my-4">
      <Field label="Tháng xem lịch sử" className="max-w-56">
        {({ id }) => (
          <Input
            id={id}
            type="month"
            value={month}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </Field>
      {capped ? (
        <p role="status" className="text-ink-2 mt-2 text-sm">
          Tháng này đạt giới hạn 500 bản ghi; danh sách có thể chưa đầy đủ. Liên hệ studio
          để kiểm tra.
        </p>
      ) : null}
    </div>
  );
}
