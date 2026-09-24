import { Link } from "react-router";

import { useMySchedule } from "~/features/booking/queries";
import type { BookingStatus, ClassType, MyScheduleItem } from "~/lib/api/schema";
import { formatDate, formatTime, weekdayLong } from "~/lib/format";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Figures } from "~/ui/figure";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";

import type { Route } from "./+types/booking-history";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Lịch sử đặt lớp — Soul Pilates" },
    { name: "robots", content: "noindex" },
  ];
}

/**
 * The closed outcomes.
 *
 * `BOOKED` is a live booking and belongs to /hv/lich-cua-toi, so it is filtered
 * out rather than rendered with a blank badge — and an unrecognised status from
 * the backend takes the same path instead of shipping an empty row.
 *
 * The two cancellations are separate states because they mean different things
 * to a student: `CANCELLED_INTIME` returned the credit, `CANCELLED_LATE` did
 * not. That is the backend's own distinction, read off the status rather than
 * recomputed from the clock.
 */
const HISTORY_STATUS: Partial<Record<BookingStatus, { label: string; tone: StatusTone }>> =
  {
    ATTENDED: { label: "Đã tập", tone: "positive" },
    NO_SHOW: { label: "Vắng", tone: "attention" },
    CANCELLED_INTIME: { label: "Đã hủy", tone: "neutral" },
    CANCELLED_LATE: { label: "Hủy muộn", tone: "neutral" },
  };

const CLASS_TYPE: Record<ClassType, string> = {
  GROUP: "Lớp nhóm",
  PRIVATE: "Lớp riêng (1 kèm 1)",
};

function isClosed(entry: MyScheduleItem): boolean {
  return HISTORY_STATUS[entry.booking_status] !== undefined;
}

/** Newest first. Ordering is presentation, not a backend rule. */
function newestFirst(a: MyScheduleItem, b: MyScheduleItem): number {
  return new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime();
}

function closedEntries(items: MyScheduleItem[]): MyScheduleItem[] {
  // `filter` already returns a new array, so the sort never touches cache data.
  return items.filter(isClosed).sort(newestFirst);
}

/**
 * There is no history endpoint.
 *
 * `GET /my-schedule?include_cancelled=true` is the whole record — live, past
 * and cancelled — and the two screens split it by status. A second endpoint
 * would be a second definition of what counts as history.
 */
export default function BookingHistory() {
  const query = useMySchedule({ include_cancelled: true, limit: 500 });

  return (
    <div className="gutter mx-auto max-w-(--container-column) py-5">
      <h1 className="text-ink text-xl font-medium">Lịch sử đặt lớp</h1>
      <p className="measure text-ink-2 mt-1 text-sm">
        Những buổi đã kết thúc, đã hủy hoặc bạn không đến. Buổi bạn đang giữ chỗ nằm ở Lịch
        của tôi.
      </p>

      <DemoDataNotice className="mt-5" />

      <div className="mt-5">
        <QueryBoundary
          query={query}
          skeletonRows={4}
          isEmpty={(items) => closedEntries(items).length === 0}
          emptyTitle="Chưa có buổi nào đã kết thúc"
          emptyDescription="Sau buổi tập đầu tiên, mỗi buổi sẽ được ghi lại ở đây cùng số buổi đã trừ vào gói."
          emptyAction={
            <Button asChild variant="secondary">
              <Link to="/hv/lop-hoc">Xem lớp học</Link>
            </Button>
          }
          errorDescription="Không tải được lịch sử đặt lớp của bạn."
        >
          {(items) => (
            <ul className="rule-t">
              {closedEntries(items).map((entry) => (
                <HistoryRow key={entry.booking_id} entry={entry} />
              ))}
            </ul>
          )}
        </QueryBoundary>
      </div>
    </div>
  );
}

function HistoryRow({ entry }: { entry: MyScheduleItem }) {
  const status = HISTORY_STATUS[entry.booking_status];
  if (!status) return null;

  const cancelled =
    entry.booking_status === "CANCELLED_INTIME" ||
    entry.booking_status === "CANCELLED_LATE";

  return (
    <li className="rule-b py-4">
      <div className="flex items-start justify-between gap-3">
        {/* min-w-0 and no truncation: a Vietnamese trainer name wraps rather
            than losing its diacritics to an ellipsis. */}
        <div className="min-w-0">
          <p className="text-ink-2 text-xs">
            {weekdayLong(entry.starts_at)} ·{" "}
            <Figures>{formatDate(entry.starts_at)}</Figures>
          </p>
          <p className="mt-1">
            <Figures className="text-ink text-base">{formatTime(entry.starts_at)}</Figures>
          </p>
          <p className="text-ink mt-1 text-sm">{CLASS_TYPE[entry.class_type]}</p>
          <p className="text-ink-2 mt-0.5 text-xs">{entry.trainer_name}</p>
        </div>
        <span className="shrink-0">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </span>
      </div>

      {/* The one fact a student opens this screen for: did the credit come
          back. The status says so — `CANCELLED_INTIME` is the refunded one —
          so there is no arithmetic here and none is possible. */}
      {cancelled ? (
        <p className="measure text-ink mt-3 text-sm">
          {entry.booking_status === "CANCELLED_INTIME"
            ? "Buổi tập đã được hoàn lại vào gói."
            : "Hủy sau hạn nên buổi tập không được hoàn lại."}
        </p>
      ) : null}

      {entry.session_status === "CANCELLED" ? (
        <p className="text-ink-2 mt-2 text-xs">Studio đã hủy buổi này.</p>
      ) : null}
    </li>
  );
}
