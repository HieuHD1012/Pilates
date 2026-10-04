import { ChevronRight, Clock, RefreshCw, UserRound, UserRoundCog } from "lucide-react";
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
  minutesBetween,
  telHref,
  weekdayLong,
} from "~/lib/format";
import { Button } from "~/ui/button";
import { Dialog, DialogContent } from "~/ui/dialog";
import { Field, FormActions, Select, Textarea } from "~/ui/field";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import {
  EmptyState,
  ErrorState,
  LiveRegion,
  RefreshingRule,
  Skeleton,
  SkeletonRows,
} from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";
import {
  InlineNote,
  Meter,
  Panel,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PersonCell,
  WorkspacePage,
} from "~/ui/workspace";

import type { Route } from "./+types/class-detail";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Chi tiết lớp — J Pilates" }, { name: "robots", content: "noindex" }];
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
  const [cancelling, setCancelling] = useState(false);
  const live = session.data?.status === "SCHEDULED";

  return (
    <WorkspacePage>
      <LiveRegion message={notice} />

      <QueryBoundary
        query={session}
        isEmpty={() => false}
        loading={<DetailSkeleton />}
        showErrorDetail
        errorDescription="Không mở được lớp này. Lớp có thể đã bị xóa hoặc đường dẫn không còn đúng."
      >
        {(item) => <ClassHeader session={item} onNotice={setNotice} />}
      </QueryBoundary>

      <Panel className="overflow-hidden">
        <PanelHeader
          title={
            <span className="flex items-baseline gap-2">
              Học viên đã đăng ký
              <Figures className="text-ink-2 text-sm font-normal">
                {roster.data?.length ?? ""}
              </Figures>
            </span>
          }
          description={
            // The one place the screen states capacity. `seats_left` is the
            // backend's count, not ours.
            session.data ? (
              <>
                <Figures className="text-ink">
                  {session.data.booked_count}/{session.data.capacity}
                </Figures>{" "}
                chỗ đã giữ
                {live && session.data.seats_left === 0 ? " · đủ chỗ" : null}
                {/* The meter illustrates the fraction, so it sits right after
                    it rather than alone at the panel's far edge. */}
                {session.data.capacity > 0 ? (
                  <Meter
                    className="ml-3 inline-block w-24 align-middle"
                    value={session.data.booked_count}
                    max={session.data.capacity}
                    tone={session.data.seats_left === 0 ? "attention" : "neutral"}
                  />
                ) : null}
              </>
            ) : undefined
          }
        />

        {/* The four states by hand rather than through QueryBoundary: its
            empty and error blocks carry no inset, and here they sit inside a
            panel whose table runs edge to edge. */}
        <RefreshingRule active={roster.isFetching && !roster.isPending} />
        {roster.isPending ? (
          <PanelBody>
            <SkeletonRows rows={4} />
          </PanelBody>
        ) : roster.isError ? (
          <PanelBody>
            <ErrorState
              description="Không tải được danh sách đăng ký."
              detail={roster.error.message}
              onRetry={() => void roster.refetch()}
            />
          </PanelBody>
        ) : roster.data.length === 0 ? (
          <PanelBody>
            <EmptyState
              className="py-6"
              title="Chưa có học viên nào"
              description="Học viên tự đặt trong ứng dụng; studio không đặt thay."
            />
          </PanelBody>
        ) : (
          <DataTable caption="Học viên đã đăng ký lớp này" minWidth="30rem">
            <thead>
              <tr>
                <Th>Học viên</Th>
                <Th>Đăng ký lúc</Th>
                <Th>Trạng thái</Th>
              </tr>
            </thead>
            <tbody>
              {roster.data.map((row) => (
                <BookedRow key={row.bookingId} row={row} />
              ))}
            </tbody>
          </DataTable>
        )}

        {/* The rare action sits under the bookings it refunds, quiet, with
            the one line that says what it does to them. */}
        {session.data && live ? (
          <PanelFooter>
            <span>Hủy lớp hoàn buổi cho mọi lượt đăng ký, kể cả khi đã quá hạn hủy.</span>
            <Button
              variant="ghost"
              className="text-danger hover:text-danger active:text-danger decoration-danger/30 hover:decoration-danger active:decoration-danger px-2"
              onClick={() => setCancelling(true)}
            >
              Hủy lớp
            </Button>
          </PanelFooter>
        ) : null}
      </Panel>

      {session.data ? (
        <CancelClassDialog
          session={session.data}
          open={cancelling}
          onOpenChange={setCancelling}
          onDone={setNotice}
        />
      ) : null}
    </WorkspacePage>
  );
}

/**
 * Where the class sits and who teaches it. Format and hour are the title;
 * status appears only when it says something the rest does not — a cancelled
 * class — and the seats are the roster's, so they are not repeated here.
 */
function ClassHeader({
  session,
  onNotice,
}: {
  session: ClassSessionDetailResponse;
  onNotice: (message: string) => void;
}) {
  const [reassigning, setReassigning] = useState(false);
  const trainers = useStudioTrainers();

  const live = session.status === "SCHEDULED";

  return (
    <>
      <PageHeader
        eyebrow={
          <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-1.5">
            <Link
              to="/studio/lich"
              className="decoration-rule-2 hover:text-ink underline underline-offset-[6px]"
            >
              Lịch &amp; lớp học
            </Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span aria-current="page">
              {weekdayLong(session.starts_at)},{" "}
              <Figures>{formatDate(session.starts_at)}</Figures>
            </span>
          </nav>
        }
        title={`${CLASS_TYPE[session.class_type]} · ${formatTime(session.starts_at)}`}
        actions={
          live ? (
            <Button
              variant="secondary"
              icon={<UserRoundCog className="size-4" aria-hidden="true" />}
              onClick={() => setReassigning(true)}
            >
              Đổi huấn luyện viên
            </Button>
          ) : null
        }
        meta={
          <div className="text-ink-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" />
              <Figures className="text-ink">
                {formatTimeRange(session.starts_at, session.ends_at)}
              </Figures>
              · <Figures>{minutesBetween(session.starts_at, session.ends_at)}</Figures> phút
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-4" aria-hidden="true" />
              <span className="sr-only">Huấn luyện viên: </span>
              <span className="text-ink">{session.trainer_name}</span>
            </span>
            {/* A category, not a state: plain text. */}
            {session.recurrence_id ? (
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="size-4" aria-hidden="true" />
                Lớp định kỳ
              </span>
            ) : null}
            {session.status === "CANCELLED" ? (
              <StatusBadge tone="critical">Đã hủy</StatusBadge>
            ) : null}
          </div>
        }
      />

      {session.cancel_reason ? (
        <InlineNote className="bg-danger-wash/70">
          Lý do hủy: <span className="text-ink">{session.cancel_reason}</span>
        </InlineNote>
      ) : null}

      <ReassignTrainerDialog
        session={session}
        trainers={trainers.data ?? []}
        open={reassigning}
        onOpenChange={setReassigning}
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
        busy={assign.isPending}
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
            <Button
              variant="secondary"
              size="sm"
              disabled={assign.isPending}
              onClick={() => onOpenChange(false)}
            >
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
        busy={cancel.isPending}
        title="Hủy lớp này"
        description={`${weekdayLong(session.starts_at)}, ${formatTimeRange(session.starts_at, session.ends_at)}. ${session.booked_count} lượt đăng ký sẽ được hoàn buổi.`}
      >
        <div className="flex flex-col gap-4">
          <Field
            label="Lý do hủy"
            required
            hint="Lý do được lưu vào hồ sơ lớp. Studio chủ động báo cho học viên."
          >
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
            <Button
              variant="secondary"
              size="sm"
              disabled={cancel.isPending}
              onClick={() => onOpenChange(false)}
            >
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
    <Tr>
      <Td>
        <PersonCell
          avatarName={row.studentName}
          name={
            <Link
              to={`/studio/hoc-vien/${row.studentId}`}
              className="decoration-rule-2 hover:text-copper hover:decoration-copper underline-offset-[6px] hover:underline"
            >
              {row.studentName}
            </Link>
          }
          detail={
            row.phone ? (
              <a
                href={telHref(row.phone)}
                className="figures decoration-rule-2 hover:text-copper hover:decoration-copper underline underline-offset-[5px]"
              >
                {formatPhone(row.phone)}
              </a>
            ) : null
          }
        />
      </Td>
      <Td className="text-ink-2 whitespace-nowrap">
        <Figures>{formatDate(row.createdAt)}</Figures>{" "}
        <Figures>{formatTime(row.createdAt)}</Figures>
      </Td>
      <Td>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </Td>
    </Tr>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-56 max-w-full" />
      <Skeleton className="mt-3 h-8 w-64 max-w-full" />
      <Skeleton className="mt-3 h-3 w-80 max-w-full" />
      <span className="sr-only">Đang tải chi tiết lớp</span>
    </div>
  );
}
