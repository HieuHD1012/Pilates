import { Link } from "react-router";

import { useBookingHistory } from "~/features/booking/queries";
import type { BookingHistoryEntry, BookingStatus, ClassType } from "~/lib/api/types";
import { cn } from "~/lib/cn";
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
 * The three closed outcomes. `booked` and `waitlisted` are live bookings and
 * belong to /hv/lich-cua-toi, so they are filtered out rather than rendered
 * with a blank badge — and an unrecognised status from the backend takes the
 * same path instead of shipping an empty row.
 */
const HISTORY_STATUS: Partial<Record<BookingStatus, { label: string; tone: StatusTone }>> =
  {
    attended: { label: "Đã tập", tone: "positive" },
    cancelled: { label: "Đã hủy", tone: "neutral" },
    no_show: { label: "Vắng", tone: "attention" },
  };

const CLASS_TYPE: Record<ClassType, string> = {
  group: "Lớp nhóm",
  private: "Lớp riêng (1 kèm 1)",
};

function isClosed(entry: BookingHistoryEntry): boolean {
  return HISTORY_STATUS[entry.status] !== undefined;
}

/** Newest first. Ordering is presentation, not a backend rule. */
function newestFirst(a: BookingHistoryEntry, b: BookingHistoryEntry): number {
  return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
}

function closedEntries(items: BookingHistoryEntry[]): BookingHistoryEntry[] {
  // `filter` already returns a new array, so the sort never touches cache data.
  return items.filter(isClosed).sort(newestFirst);
}

export default function BookingHistory() {
  const query = useBookingHistory();

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
                <HistoryRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </QueryBoundary>
      </div>
    </div>
  );
}

function HistoryRow({ entry }: { entry: BookingHistoryEntry }) {
  const status = HISTORY_STATUS[entry.status];
  if (!status) return null;

  const cancelled = entry.status === "cancelled";
  const charged = entry.sessionsCharged !== 0;

  return (
    <li className="rule-b py-4">
      <div className="flex items-start justify-between gap-3">
        {/* min-w-0 and no truncation: a Vietnamese class title or trainer name
            wraps rather than losing its diacritics to an ellipsis. */}
        <div className="min-w-0">
          <p className="text-ink-2 text-xs">
            {weekdayLong(entry.startsAt)} · <Figures>{formatDate(entry.startsAt)}</Figures>
          </p>
          <p className="mt-1">
            <Figures className="text-ink text-base">{formatTime(entry.startsAt)}</Figures>
          </p>
          <p className="text-ink mt-1 text-sm">{entry.classTitle}</p>
          <p className="text-ink-2 mt-0.5 text-xs">
            {CLASS_TYPE[entry.classType]} · {entry.trainerName}
          </p>
        </div>
        <span className="shrink-0">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </span>
      </div>

      {/* The one fact a student opens this screen for: did the session come
          back. `refunded` is the backend's answer, never our arithmetic. */}
      {cancelled ? (
        <p
          className={cn(
            "measure mt-3 text-sm",
            entry.refunded === null ? "text-ink-2" : "text-ink",
          )}
        >
          {entry.refunded === true
            ? "Buổi tập đã được hoàn lại vào gói."
            : entry.refunded === false
              ? "Buổi tập không được hoàn lại vào gói."
              : "Studio chưa ghi nhận việc hoàn buổi cho lần hủy này."}
        </p>
      ) : null}

      {charged || (cancelled && entry.cancelledAt) ? (
        <div className="text-ink-2 mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
          {charged ? (
            <span>
              Đã trừ <Figures className="text-ink">{entry.sessionsCharged}</Figures> buổi
            </span>
          ) : null}
          {cancelled && entry.cancelledAt ? (
            <span>
              Hủy ngày{" "}
              <Figures className="text-ink">{formatDate(entry.cancelledAt)}</Figures>
            </span>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
