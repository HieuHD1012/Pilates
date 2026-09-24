import { useState } from "react";
import { Link, useParams } from "react-router";

import { useClassRoster, type RosterRow } from "~/features/roster/queries";
import {
  useAssignTrainer,
  useCancelClass,
  useClassSession,
  useStudioTrainers,
} from "~/features/schedule/use-staff-calendar";
import { errorMessage } from "~/lib/api/client";
import type {
  BookingStatus,
  ClassSessionDetailResponse,
  ClassType,
  TrainerResponse,
} from "~/lib/api/schema";
import {
  formatDate,
  formatPhone,
  formatTime,
  formatTimeRange,
  telHref,
  weekdayLong,
} from "~/lib/format";
import { Button } from "~/ui/button";
import { Dialog, DialogContent } from "~/ui/dialog";
import { Field, FormActions, Select, Textarea } from "~/ui/field";
import { LiveRegion, Skeleton, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { CapacityMeter, StatusBadge, type StatusTone } from "~/ui/status";

import type { Route } from "./+types/class-detail";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Chi tiết lớp — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

const CLASS_TYPE: Record<ClassType, string> = {
  GROUP: "Lớp nhóm",
  PRIVATE: "Lớp riêng",
};

/** The same vocabulary the trainer roster uses — one roster shape, one wording. */
const BOOKING_STATUS: Record<BookingStatus, { tone: StatusTone; label: string }> = {
  BOOKED: { tone: "neutral", label: "Đã đặt" },
  ATTENDED: { tone: "positive", label: "Đã đến lớp" },
  NO_SHOW: { tone: "attention", label: "Vắng mặt" },
  CANCELLED_INTIME: { tone: "critical", label: "Đã hủy" },
  CANCELLED_LATE: { tone: "critical", label: "Hủy muộn" },
};

/**
 * One class, and what the studio may do to it.
 *
 * Two things this screen deliberately cannot do, because the backend does not
 * offer them and neither is an oversight:
 *
 *  - **It cannot edit the class.** There is no endpoint to move a scheduled
 *    session's time or change its capacity. The studio creates and cancels; it
 *    does not reschedule people into a new slot. Reassigning the trainer is the
 *    one edit, and it has its own endpoint.
 *  - **Staff cannot book, cancel or move a student's booking.** `POST /bookings`
 *    and its cancel and change are STUDENT-only, own profile only. A control
 *    here would be a control that always answers 403.
 */
export default function StaffClassDetail() {
  const { classId = "" } = useParams();
  const sessionId = Number(classId);
  const session = useClassSession(sessionId);
  const roster = useClassRoster(sessionId);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="gutter max-w-(--container-column) py-6">
      <LiveRegion message={notice} />

      <Link
        to="/studio/lich"
        className="text-ink-2 decoration-rule-2 hover:text-ink text-xs underline underline-offset-[6px]"
      >
        Lịch &amp; lớp học
      </Link>

      <QueryBoundary
        query={session}
        isEmpty={() => false}
        loading={<DetailSkeleton />}
        showErrorDetail
        errorDescription="Không mở được lớp này. Lớp có thể đã bị xóa hoặc đường dẫn không còn đúng."
      >
        {(item) => <ClassBody session={item} onNotice={setNotice} />}
      </QueryBoundary>

      <section className="mt-8">
        <h2 className="flex items-baseline gap-2">
          <span className="text-ink text-sm font-medium">Học viên đã đăng ký</span>
          <Figures className="text-ink-2 text-xs">{roster.data?.length ?? ""}</Figures>
        </h2>

        <div className="mt-3">
          <QueryBoundary
            query={roster}
            skeletonRows={4}
            emptyTitle="Chưa có học viên nào"
            emptyDescription="Chưa có ai đăng ký buổi này."
            errorDescription="Không tải được danh sách đăng ký."
            showErrorDetail
          >
            {(rows) => (
              <ul className="rule-t">
                {rows.map((row) => (
                  <li key={row.bookingId} className="rule-b">
                    <BookedRow row={row} />
                  </li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </div>

        <p className="rule-t text-ink-2 measure mt-6 pt-3 text-xs">
          Chỉ học viên tự đăng ký, hủy và đổi lớp của mình — đây là quy tắc đã chốt, không
          phải tính năng còn thiếu. Nếu cần hủy cho cả lớp, dùng “Hủy lớp”: mọi lượt đăng ký
          được hoàn buổi, bất kể còn hạn hủy hay không.
        </p>
      </section>
    </div>
  );
}

function ClassBody({
  session,
  onNotice,
}: {
  session: ClassSessionDetailResponse;
  onNotice: (message: string) => void;
}) {
  const [reassigning, setReassigning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const trainers = useStudioTrainers();

  const live = session.status === "SCHEDULED";

  return (
    <>
      <PageHeader
        className="mt-4"
        title={CLASS_TYPE[session.class_type]}
        description={`${weekdayLong(session.starts_at)}, ${formatDate(session.starts_at)} · ${formatTimeRange(session.starts_at, session.ends_at)}`}
        actions={
          live ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => setReassigning(true)}>
                Đổi huấn luyện viên
              </Button>
              <Button size="sm" variant="danger" onClick={() => setCancelling(true)}>
                Hủy lớp
              </Button>
            </>
          ) : null
        }
        meta={
          <dl className="text-ink-2 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-xs">
            <div className="flex items-baseline gap-2">
              <dt>Huấn luyện viên</dt>
              <dd className="text-ink">{session.trainer_name}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Chỗ đã giữ</dt>
              <dd>
                <CapacityMeter booked={session.booked_count} capacity={session.capacity} />
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Trạng thái</dt>
              <dd>
                {session.status === "CANCELLED" ? (
                  <StatusBadge tone="critical">Đã hủy</StatusBadge>
                ) : session.seats_left === 0 ? (
                  <StatusBadge tone="attention">Đủ chỗ</StatusBadge>
                ) : (
                  <StatusBadge tone="positive">Còn chỗ</StatusBadge>
                )}
              </dd>
            </div>
            {session.recurrence_id ? (
              <div className="flex items-baseline gap-2">
                <dt>Thuộc lịch lặp</dt>
                <dd className="text-ink">Có</dd>
              </div>
            ) : null}
          </dl>
        }
      />

      {session.cancel_reason ? (
        <p className="rule-t text-ink-2 measure mt-4 pt-3 text-sm">
          Lý do hủy: <span className="text-ink">{session.cancel_reason}</span>
        </p>
      ) : null}

      <ReassignTrainerDialog
        session={session}
        trainers={trainers.data ?? []}
        open={reassigning}
        onOpenChange={setReassigning}
        onDone={onNotice}
      />

      <CancelClassDialog
        session={session}
        open={cancelling}
        onOpenChange={setCancelling}
        onDone={onNotice}
      />
    </>
  );
}

/**
 * Reassigning the trainer. The backend refuses if the new trainer is already
 * teaching at that hour and says so in a sentence, which is the sentence shown.
 */
function ReassignTrainerDialog({
  session,
  trainers,
  open,
  onOpenChange,
  onDone,
}: {
  session: ClassSessionDetailResponse;
  trainers: TrainerResponse[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (message: string) => void;
}) {
  const [trainerId, setTrainerId] = useState(String(session.trainer_id));
  const assign = useAssignTrainer(session.id);

  const unchanged = Number(trainerId) === session.trainer_id;
  // An inactive trainer already on the class stays listed, so saving something
  // else never silently reassigns the session.
  const assignable = trainers.filter(
    (trainer) => trainer.is_active || trainer.id === session.trainer_id,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          assign.reset();
          setTrainerId(String(session.trainer_id));
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        title="Đổi huấn luyện viên"
        description={`${weekdayLong(session.starts_at)}, ${formatTimeRange(session.starts_at, session.ends_at)}. Giờ và sức chứa của lớp không thay đổi.`}
      >
        <div className="flex flex-col gap-4">
          <Field label="Huấn luyện viên" required>
            {({ id }) => (
              <Select
                id={id}
                value={trainerId}
                aria-invalid={assign.isError}
                onChange={(event) => setTrainerId(event.target.value)}
              >
                {assignable.map((trainer) => (
                  <option key={trainer.id} value={String(trainer.id)}>
                    {trainer.full_name}
                    {trainer.is_active ? "" : " (đã nghỉ)"}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {assign.isError ? (
            <div role="alert">
              <p className="text-danger text-sm">
                {errorMessage(
                  assign.error,
                  "Chưa đổi được huấn luyện viên. Vui lòng thử lại sau ít phút.",
                )}
              </p>
              <p className="text-ink-2 mt-1.5 text-xs">
                Chọn người khác, hoặc hủy lớp này và xếp lại vào giờ khác.
              </p>
            </div>
          ) : null}

          <FormActions>
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button
              size="sm"
              pending={assign.isPending}
              disabled={unchanged}
              onClick={() => {
                assign.mutate(
                  { trainer_id: Number(trainerId) },
                  {
                    onSuccess: (saved) => {
                      onOpenChange(false);
                      const name =
                        assignable.find((t) => t.id === saved.trainer_id)?.full_name ??
                        `HLV #${saved.trainer_id}`;
                      onDone(`Lớp này giờ do ${name} phụ trách.`);
                    },
                  },
                );
              }}
            >
              Lưu
            </Button>
          </FormActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Cancelling the class. The reason is not bookkeeping — it is what staff will
 * tell the students who were booked, and the backend requires it.
 *
 * Every held booking is refunded, whatever the hour: a class the studio calls
 * off is not the student's late cancellation.
 */
function CancelClassDialog({
  session,
  open,
  onOpenChange,
  onDone,
}: {
  session: ClassSessionDetailResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const cancel = useCancelClass(session.id);
  const tooShort = reason.trim().length < 3;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          cancel.reset();
          setReason("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        title="Hủy lớp này"
        description={`${weekdayLong(session.starts_at)}, ${formatTimeRange(session.starts_at, session.ends_at)}. ${session.booked_count} lượt đăng ký sẽ được hoàn buổi.`}
      >
        <div className="flex flex-col gap-4">
          <Field label="Lý do hủy" required hint="Học viên sẽ được báo lý do này.">
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            )}
          </Field>

          {cancel.isError ? (
            <p role="alert" className="text-danger text-sm">
              {errorMessage(cancel.error, "Chưa hủy được lớp. Vui lòng thử lại.")}
            </p>
          ) : null}

          <FormActions>
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Giữ lớp
            </Button>
            <Button
              variant="danger"
              size="sm"
              pending={cancel.isPending}
              disabled={tooShort}
              onClick={() => {
                cancel.mutate(
                  { reason: reason.trim() },
                  {
                    onSuccess: (result) => {
                      onOpenChange(false);
                      onDone(
                        `Đã hủy lớp và hoàn buổi cho ${result.refunded_booking_ids.length} lượt đăng ký.`,
                      );
                    },
                  },
                );
              }}
            >
              Hủy lớp
            </Button>
          </FormActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookedRow({ row }: { row: RosterRow }) {
  const status = BOOKING_STATUS[row.status];

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 py-3.5">
      {/* Names wrap; a Vietnamese name is never truncated (AGENTS P5). */}
      <span className="min-w-0 flex-1">
        <Link
          to={`/studio/hoc-vien/${row.studentId}`}
          className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-sm underline underline-offset-[6px]"
        >
          {row.studentName}
        </Link>
        {row.phone ? (
          <a
            href={telHref(row.phone)}
            className="figures text-ink-2 decoration-rule-2 hover:text-lacquer hover:decoration-lacquer mt-0.5 block w-fit text-xs underline underline-offset-[5px]"
          >
            {formatPhone(row.phone)}
          </a>
        ) : null}
        <span className="text-ink-2 mt-0.5 block text-xs">
          Đăng ký <Figures>{formatDate(row.createdAt)}</Figures>{" "}
          <Figures>{formatTime(row.createdAt)}</Figures>
        </span>
      </span>

      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mt-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-3 h-3 w-72 max-w-full" />
      <SkeletonRows rows={3} className="mt-6" />
      <span className="sr-only">Đang tải chi tiết lớp</span>
    </div>
  );
}
