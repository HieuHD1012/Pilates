import { Link, useParams } from "react-router";

import { useAttendanceRoster, useMarkAttendance } from "~/features/roster/queries";
import { useClassSession } from "~/features/schedule/use-staff-calendar";
import type { AttendanceRosterItem, BookingStatus } from "~/lib/api/schema";
import { formatDate, formatTimeRange, weekdayLong } from "~/lib/format";
import { Button } from "~/ui/button";
import { Skeleton, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";

import type { Route } from "./+types/class-detail";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Lớp của tôi — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

const STATUS: Record<BookingStatus, { tone: StatusTone; label: string }> = {
  BOOKED: { tone: "neutral", label: "Đã đặt" },
  ATTENDED: { tone: "positive", label: "Đã đến lớp" },
  NO_SHOW: { tone: "attention", label: "Vắng mặt" },
  CANCELLED_INTIME: { tone: "critical", label: "Đã hủy" },
  CANCELLED_LATE: { tone: "critical", label: "Hủy muộn" },
};

/**
 * One class, who is in it, and the trainer's one job on it: attendance.
 *
 * `GET /classes/{id}/attendance` carries names and statuses and deliberately
 * carries no phone number, no package and no money — a teaching list is not a
 * customer record. Cancelled bookings never appear.
 *
 * Marking is refused by the backend until the class has ended, so the controls
 * appear only then. A button that exists to be rejected is worse than no button.
 */
export default function TrainerClassDetail() {
  const { classId = "" } = useParams();
  const sessionId = Number(classId);
  const session = useClassSession(sessionId);
  const roster = useAttendanceRoster(sessionId);
  const mark = useMarkAttendance(sessionId);

  // Anchored to the fetch, not to render: reading the clock while rendering
  // produces output that changes without the data changing.
  const now = roster.dataUpdatedAt || 0;
  const finished =
    session.data !== undefined && new Date(session.data.ends_at).getTime() <= now;

  return (
    <div className="gutter mx-auto max-w-(--container-column) py-5">
      <Link
        to="/hlv/lich-day"
        className="text-ink-2 decoration-rule-2 hover:text-ink text-xs underline underline-offset-[6px]"
      >
        Lịch dạy
      </Link>

      <div className="mt-4">
        <QueryBoundary
          query={session}
          isEmpty={() => false}
          loading={<RosterSkeleton />}
          errorDescription="Không mở được lớp này. Lớp có thể đã bị hủy hoặc đường dẫn không còn đúng."
        >
          {(item) => (
            <header>
              <p className="label-micro">
                {weekdayLong(item.starts_at)} · {formatDate(item.starts_at)}
              </p>
              <Figures className="text-ink mt-2 block text-lg">
                {formatTimeRange(item.starts_at, item.ends_at)}
              </Figures>
              <h1 className="text-ink mt-1 text-xl font-medium">
                {item.class_type === "PRIVATE" ? "Lớp riêng (1 kèm 1)" : "Lớp nhóm"}
              </h1>

              <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <p className="text-ink-2 text-sm">
                  <Figures>{item.booked_count}</Figures>/<Figures>{item.capacity}</Figures>{" "}
                  chỗ đã giữ
                </p>
                {item.status === "CANCELLED" ? (
                  <StatusBadge tone="critical">Đã hủy</StatusBadge>
                ) : null}
              </div>

              {item.cancel_reason ? (
                <p className="rule-t text-ink-2 measure mt-4 pt-3 text-sm">
                  Lý do hủy: {item.cancel_reason}
                </p>
              ) : null}
            </header>
          )}
        </QueryBoundary>

        <section className="mt-8">
          <h2 className="flex items-baseline gap-2">
            <span className="text-ink text-sm font-medium">Học viên</span>
            <Figures className="text-ink-2 text-xs">{roster.data?.length ?? ""}</Figures>
          </h2>

          <div className="mt-3">
            <QueryBoundary
              query={roster}
              skeletonRows={4}
              emptyTitle="Chưa có học viên nào"
              emptyDescription="Chưa có ai đăng ký buổi này."
              errorDescription="Không tải được danh sách học viên."
            >
              {(entries) => (
                <ul className="rule-t">
                  {entries.map((entry) => (
                    <li key={entry.id} className="rule-b py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                        <span className="text-ink min-w-0 flex-1 text-sm">
                          {entry.student_name}
                        </span>
                        <StatusBadge tone={STATUS[entry.status].tone}>
                          {STATUS[entry.status].label}
                        </StatusBadge>
                      </div>

                      {finished && session.data?.status !== "CANCELLED" ? (
                        <AttendanceControls
                          entry={entry}
                          pending={mark.isPending}
                          onMark={(status) => mark.mutate({ bookingId: entry.id, status })}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </QueryBoundary>
          </div>

          {!finished ? (
            <p className="rule-t text-ink-2 measure mt-4 pt-3 text-xs">
              Điểm danh mở sau khi lớp kết thúc. Danh sách hiện ra trước để bạn chuẩn bị.
            </p>
          ) : null}

          {mark.isError ? (
            <p role="alert" className="text-danger mt-4 text-sm">
              Chưa cập nhật được điểm danh. Vui lòng thử lại.
            </p>
          ) : null}
        </section>

        {/* Marking moves no credits, which is why correcting a mistake is
            allowed rather than being a ticket to the studio. */}
        <p className="rule-t text-ink-2 measure mt-8 pt-3 text-xs">
          Điểm danh không thay đổi số buổi trong gói của học viên. Chọn nhầm thì chọn lại.
        </p>
      </div>
    </div>
  );
}

function AttendanceControls({
  entry,
  pending,
  onMark,
}: {
  entry: AttendanceRosterItem;
  pending: boolean;
  onMark: (status: "ATTENDED" | "NO_SHOW") => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={entry.status === "ATTENDED" ? "primary" : "secondary"}
        disabled={pending}
        onClick={() => onMark("ATTENDED")}
      >
        Đã đến lớp
      </Button>
      <Button
        size="sm"
        variant={entry.status === "NO_SHOW" ? "primary" : "secondary"}
        disabled={pending}
        onClick={() => onMark("NO_SHOW")}
      >
        Vắng mặt
      </Button>
    </div>
  );
}

function RosterSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-3 h-4 w-28" />
      <Skeleton className="mt-3 h-5 w-56" />
      <SkeletonRows rows={4} className="mt-8" />
      <span className="sr-only">Đang tải danh sách lớp</span>
    </div>
  );
}
