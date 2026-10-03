import { ChevronRight, Clock, Info, Plus, UserRound, UserRoundCog, X } from "lucide-react";
import { useState, type ReactNode } from "react";
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
  // An open place on a class that is already over is not an invitation to
  // anyone, so the open-seats row is for classes still to come.
  const upcoming =
    session.data !== undefined &&
    session.data.status === "SCHEDULED" &&
    new Date(session.data.ends_at).getTime() > new Date().getTime();

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

      <div className="grid items-start gap-5 md:gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
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
              session.data ? (
                <>
                  <Figures>{session.data.booked_count}</Figures> trên{" "}
                  <Figures>{session.data.capacity}</Figures> chỗ đã giữ · điểm danh do huấn
                  luyện viên làm sau khi lớp kết thúc
                </>
              ) : undefined
            }
            actions={
              session.data && session.data.capacity > 0 ? (
                <Meter
                  className="w-32"
                  value={session.data.booked_count}
                  max={session.data.capacity}
                  tone={session.data.seats_left === 0 ? "attention" : "neutral"}
                />
              ) : null
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
                description="Chưa có ai đăng ký buổi này. Học viên tự đặt trong ứng dụng; studio không đặt thay."
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
                {upcoming && session.data && session.data.seats_left > 0 ? (
                  <OpenSeatsRow seats={session.data.seats_left} />
                ) : null}
              </tbody>
            </DataTable>
          )}
        </Panel>

        <div className="flex flex-col gap-5 md:gap-6">
          {session.data ? <ClassFacts session={session.data} /> : null}
          <InlineNote icon={<Info aria-hidden="true" />}>
            Chỉ học viên tự đăng ký, hủy và đổi lớp của mình — đây là quy tắc đã chốt, không
            phải tính năng còn thiếu. Nếu cần hủy cho cả lớp, dùng “Hủy lớp”: mọi lượt đăng
            ký được hoàn buổi, bất kể còn hạn hủy hay không.
          </InlineNote>
        </div>
      </div>
    </WorkspacePage>
  );
}

function ClassHeader({
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
            <>
              <Button
                variant="secondary"
                icon={<UserRoundCog className="size-4" aria-hidden="true" />}
                onClick={() => setReassigning(true)}
              >
                Đổi huấn luyện viên
              </Button>
              <Button
                variant="danger"
                icon={<X className="size-4" aria-hidden="true" />}
                onClick={() => setCancelling(true)}
              >
                Hủy lớp
              </Button>
            </>
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
            <SessionStatus session={session} />
            {session.recurrence_id ? (
              <StatusBadge tone="neutral">Lớp định kỳ</StatusBadge>
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

      <CancelClassDialog
        session={session}
        open={cancelling}
        onOpenChange={setCancelling}
        onDone={onNotice}
      />
    </>
  );
}

/** Seats as the backend states them: `seats_left` is its count, not ours. */
function SessionStatus({ session }: { session: ClassSessionDetailResponse }) {
  if (session.status === "CANCELLED") {
    return <StatusBadge tone="critical">Đã hủy</StatusBadge>;
  }
  if (session.seats_left === 0) {
    return <StatusBadge tone="attention">Đủ chỗ</StatusBadge>;
  }
  return <StatusBadge tone="positive">Còn {session.seats_left} chỗ</StatusBadge>;
}

/**
 * The class as a definition, beside the roster. Every value is a field of the
 * session; the refund deadline the canvas showed is not one of them (the staff
 * view of a class carries no cancellation terms), so it is not shown.
 */
function ClassFacts({ session }: { session: ClassSessionDetailResponse }) {
  return (
    <Panel>
      <PanelHeader title="Thông tin lớp" />
      <PanelBody>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Fact label="Hình thức">{CLASS_TYPE[session.class_type]}</Fact>
          <Fact label="Sức chứa">
            <Figures>{session.capacity}</Figures> chỗ
          </Fact>
          <Fact label="Huấn luyện viên">{session.trainer_name}</Fact>
          <Fact label="Chỗ đã giữ">
            <Figures>
              {session.booked_count}/{session.capacity}
            </Figures>
          </Fact>
          <Fact label="Thuộc lịch lặp">{session.recurrence_id ? "Có" : "Không"}</Fact>
          <Fact label="Trạng thái">
            {session.status === "CANCELLED" ? "Đã hủy" : "Đã lên lịch"}
          </Fact>
        </dl>
      </PanelBody>
    </Panel>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-2 text-xs">{label}</dt>
      <dd className="text-ink mt-0.5 text-sm wrap-anywhere">{children}</dd>
    </div>
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

/**
 * The places still open, as a row of the roster. It says who fills them, so
 * the empty space is not read as a missing "add student" control.
 */
function OpenSeatsRow({ seats }: { seats: number }) {
  return (
    <Tr>
      <Td colSpan={3} className="bg-chalk">
        <span className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="border-rule-2 text-ink-3 grid size-9 shrink-0 place-items-center rounded-full border border-dashed"
          >
            <Plus className="size-3.5" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-ink-2 text-sm">
              <Figures>{seats}</Figures> chỗ trống
            </span>
            <span className="text-ink-2 text-xs">
              Học viên tự đặt trong ứng dụng; studio không đặt thay.
            </span>
          </span>
        </span>
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
