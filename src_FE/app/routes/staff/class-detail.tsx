import { useState } from "react";
import { Link, useParams } from "react-router";

import { useStudents } from "~/features/people/queries";
import { useClassRoster } from "~/features/roster/queries";
import {
  AddStudentDialog,
  CancelBookingDialog,
  RescheduleDialog,
} from "~/features/roster/roster-actions";
import { ClassForm, readTrainerConflict } from "~/features/schedule/class-form";
import {
  useCancelClass,
  useStaffTrainers,
  useUpdateClass,
} from "~/features/schedule/use-staff-calendar";
import type {
  BookingStatus,
  ClassRoster,
  ClassSession,
  ClassType,
  RosterEntry,
  Trainer,
} from "~/lib/api/types";
import {
  formatDate,
  formatDayMonth,
  formatPhone,
  formatTime,
  formatTimeRange,
  studioDateKey,
  telHref,
  weekdayLong,
} from "~/lib/format";
import { Button } from "~/ui/button";
import { DemoDataNotice } from "~/ui/demo-data-notice";
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
  group: "Lớp nhóm",
  private: "Lớp riêng",
};

/** The same vocabulary the trainer roster uses — one roster shape, one wording. */
const BOOKING_STATUS: Record<BookingStatus, { tone: StatusTone; label: string }> = {
  booked: { tone: "neutral", label: "Đã đặt" },
  waitlisted: { tone: "info", label: "Chờ chỗ" },
  attended: { tone: "positive", label: "Đã tập" },
  cancelled: { tone: "critical", label: "Đã hủy" },
  no_show: { tone: "attention", label: "Không đến" },
};

/**
 * One class, and who is in it — the staff view.
 *
 * The winning subject is the class: the header carries every fact needed to
 * identify the buổi tập, and each roster row is an attribute of one person in
 * it. Staff see two things the trainer view does not, because staff answer for
 * them: when the booking was made, and how many buổi it charged.
 *
 * Editing, reassigning the trainer and cancelling all happen here, because this
 * is the screen that already knows who is booked — the number a capacity change
 * or a cancellation has to be weighed against. Promoting from the waitlist still
 * does not exist: Q7 is unanswered and the function list contradicts itself on
 * whether promotion is automatic, so the screen says so rather than guessing.
 */
export default function StaffClassDetail() {
  const { classId = "" } = useParams();
  const query = useClassRoster(classId, "staff");
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="gutter max-w-(--container-column) py-6">
      <Link
        to="/studio/lich"
        className="text-ink-2 decoration-rule-2 hover:text-ink text-xs underline underline-offset-[6px]"
      >
        Lịch &amp; lớp học
      </Link>

      <QueryBoundary
        query={query}
        // A class nobody has booked is still a class the studio runs, so the
        // header must render; the empty roster is stated in place, below.
        isEmpty={() => false}
        loading={<ClassSkeleton />}
        errorDescription="Không mở được lớp này. Lớp có thể đã bị hủy hoặc đường dẫn không còn đúng."
        showErrorDetail
      >
        {(roster) => {
          const session = roster.classSession;
          const full = session.bookedCount >= session.capacity;

          return (
            <>
              <PageHeader
                className="mt-4"
                title={session.title}
                description="Danh sách học viên đã đăng ký và danh sách chờ của buổi tập này."
                actions={
                  session.status === "cancelled" ? null : (
                    <ClassActions
                      session={session}
                      bookedCount={roster.booked.length}
                      onDone={setNotice}
                    />
                  )
                }
                meta={
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                    <dl className="text-ink-2 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs">
                      <div className="flex items-baseline gap-2">
                        <dt>Ngày</dt>
                        <dd className="text-ink">
                          {weekdayLong(session.startsAt)},{" "}
                          <Figures className="whitespace-nowrap">
                            {formatDate(session.startsAt)}
                          </Figures>
                        </dd>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <dt>Giờ</dt>
                        <dd>
                          <Figures className="text-ink whitespace-nowrap">
                            {formatTimeRange(session.startsAt, session.endsAt)}
                          </Figures>
                        </dd>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <dt>Hình thức</dt>
                        <dd className="text-ink">{CLASS_TYPE[session.type]}</dd>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <dt>Huấn luyện viên</dt>
                        <dd className="text-ink">{session.trainer.fullName}</dd>
                      </div>
                      {session.room ? (
                        <div className="flex items-baseline gap-2">
                          <dt>Phòng</dt>
                          <dd className="text-ink">{session.room}</dd>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2">
                        <dt>Sức chứa</dt>
                        <dd>
                          <CapacityMeter
                            booked={session.bookedCount}
                            capacity={session.capacity}
                          />
                        </dd>
                      </div>
                    </dl>

                    {session.status === "cancelled" ? (
                      <StatusBadge tone="critical">Đã hủy</StatusBadge>
                    ) : full ? (
                      <StatusBadge tone="attention">Đủ chỗ</StatusBadge>
                    ) : (
                      <StatusBadge tone="positive">Còn chỗ</StatusBadge>
                    )}
                  </div>
                }
              />

              {/* Why it was cancelled, and the studio's own note about the buổi.
                  Two different facts, so they are never the same paragraph. */}
              {session.cancellationReason ? (
                <p className="measure-wide mt-4 text-sm">
                  <span className="text-ink-2">Lý do hủy: </span>
                  <span className="text-ink">{session.cancellationReason}</span>
                </p>
              ) : null}
              {session.note ? (
                <p className="measure-wide text-ink-2 mt-2 text-sm">{session.note}</p>
              ) : null}

              <DemoDataNotice className="mt-5" />

              <RosterSection session={session} roster={roster} onDone={setNotice} />

              {roster.waitlist.length > 0 ? (
                <section className="mt-9">
                  <h2 className="flex items-baseline gap-2">
                    <span className="text-ink text-sm font-medium">Danh sách chờ</span>
                    <Figures className="text-ink-2 text-xs">
                      {roster.waitlist.length}
                    </Figures>
                  </h2>

                  <ul className="rule-t mt-3">
                    {roster.waitlist.map((entry) => (
                      <li
                        key={entry.bookingId}
                        className="rule-b flex items-baseline gap-4 py-3.5"
                      >
                        {/* Queue order belongs to the backend; when it sends no
                            position, none is shown rather than counted here. */}
                        <span className="w-6 shrink-0">
                          {entry.waitlistPosition !== null ? (
                            <Figures className="text-ink-2 text-xs">
                              {entry.waitlistPosition}
                            </Figures>
                          ) : null}
                        </span>
                        <Person entry={entry} />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="rule-t mt-10 pt-4">
                <h2 className="text-ink text-sm font-medium">
                  Chưa làm được ở màn hình này
                </h2>
                <p className="measure-wide text-ink-2 mt-2 text-xs">
                  Chuyển học viên từ danh sách chờ vào lớp: studio chưa trả lời việc này tự
                  động hay do nhân viên xác nhận (Q7), nên chưa có nút. Danh sách chờ ở trên
                  vẫn hiển thị đúng thứ tự hệ thống ghi nhận.
                </p>
              </section>
            </>
          );
        }}
      </QueryBoundary>

      <LiveRegion message={notice} />
    </div>
  );
}

/**
 * A booked row. Below md it stacks — a studio phone reads name, then the two
 * figures written out as sentences. From md the figures move into fixed columns
 * so a roster of twenty can be scanned down without a table header.
 */
function BookedRow({
  entry,
  editable,
  onCancel,
  onReschedule,
}: {
  entry: RosterEntry;
  /** A cancelled class and a cancelled booking are both past acting on. */
  editable: boolean;
  onCancel: () => void;
  onReschedule: () => void;
}) {
  const status = BOOKING_STATUS[entry.status];
  const actionable = editable && entry.status === "booked";

  return (
    // `minmax(0,…)` let the name column collapse to 114px once the actions column
    // was added — narrow enough that a demo name wrapped, and a real Vietnamese
    // name would wrap every time. A name gets a floor (AGENTS P5).
    <div className="grid gap-x-6 gap-y-2 py-3.5 lg:grid-cols-[minmax(13rem,1fr)_auto] lg:items-baseline">
      <Person entry={entry} />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 lg:grid lg:grid-cols-[8.5rem_6rem_auto_auto] lg:items-baseline">
        <span className="text-ink-2 text-xs">
          Đặt lúc{" "}
          <Figures className="text-ink whitespace-nowrap">
            {formatTime(entry.bookedAt)}
          </Figures>{" "}
          <Figures className="whitespace-nowrap">{formatDayMonth(entry.bookedAt)}</Figures>
        </span>

        <span className="text-ink-2 text-xs">
          Trừ <Figures className="text-ink">{entry.sessionsCharged}</Figures> buổi
        </span>

        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>

        {/* Absent rather than disabled on a row nothing can be done to: a
            disabled control invites a second click. */}
        {actionable ? (
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={onReschedule}
              className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-xs underline underline-offset-[6px]"
            >
              Đổi buổi
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-ink-2 decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-xs underline underline-offset-[6px]"
            >
              Hủy
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Name over phone. The name is the link into the student record and it wraps —
 * staff phoning a student need the whole string, and a Vietnamese name clipped
 * at a column edge or hidden behind a hover title is unusable (AGENTS P5).
 */
function Person({ entry }: { entry: RosterEntry }) {
  return (
    <span className="min-w-0 flex-1">
      <Link
        to={`/studio/hoc-vien/${entry.studentId}`}
        className="text-ink decoration-rule-2 text-sm underline-offset-[6px] hover:underline"
      >
        {entry.fullName}
      </Link>

      {entry.phone ? (
        <a
          href={telHref(entry.phone)}
          className="figures text-ink-2 decoration-rule-2 hover:text-lacquer hover:decoration-lacquer mt-0.5 block w-fit text-xs underline underline-offset-[5px]"
        >
          {formatPhone(entry.phone)}
        </a>
      ) : (
        <span className="text-ink-2 mt-0.5 block text-xs">Chưa có số điện thoại</span>
      )}
    </span>
  );
}

/** Shaped like the screen it replaces: a header block, then ruled rows. */
function ClassSkeleton() {
  return (
    <div className="mt-4">
      <div className="rule-b pb-4">
        <Skeleton className="h-5 w-56 max-w-full" />
        <Skeleton className="mt-3 h-3 w-72 max-w-full" />
        <Skeleton className="mt-4 h-3 w-full max-w-96" />
      </div>
      <SkeletonRows rows={5} className="mt-7" />
    </div>
  );
}

/**
 * Sửa lớp, đổi huấn luyện viên, hủy lớp.
 *
 * All three sit behind their own dialog rather than inline, because each is a
 * write that other people see: a class moving changes a trainer's day and a
 * student's week. Reassigning gets its own entry point even though the edit form
 * can do it — changing who teaches is the change staff make most often, and
 * making them scroll a nine-field form for it is the kind of friction that ends
 * with someone editing the wrong field.
 */
function ClassActions({
  session,
  bookedCount,
  onDone,
}: {
  session: ClassSession;
  bookedCount: number;
  onDone: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const trainers = useStaffTrainers();
  const update = useUpdateClass(session.id);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setReassigning(true)}>
        Đổi huấn luyện viên
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
        Sửa lớp
      </Button>
      {/* Not a peer of the other two. Cancelling is the exception and it is
          one-way, so it reads as a link rather than a third equal button. */}
      <Button size="sm" variant="ghost" onClick={() => setCancelling(true)}>
        Hủy lớp
      </Button>

      <ReassignTrainerDialog
        session={session}
        trainers={trainers.data ?? []}
        open={reassigning}
        onOpenChange={setReassigning}
        onDone={onDone}
      />

      <Dialog
        open={editing}
        onOpenChange={(next) => {
          if (!next) {
            update.reset();
            setEditing(false);
          }
        }}
      >
        <DialogContent
          title="Sửa lớp"
          description={
            bookedCount === 0
              ? "Chưa có ai đăng ký buổi này."
              : `${bookedCount} học viên đã đăng ký buổi này — đổi giờ nghĩa là họ cần được thông báo.`
          }
        >
          <ClassForm
            trainers={trainers.data ?? []}
            bookedCount={bookedCount}
            defaultValues={{
              title: session.title,
              type: session.type,
              trainerId: session.trainer.id,
              date: studioDateKey(session.startsAt),
              startTime: formatTime(session.startsAt),
              durationMinutes: String(
                Math.round(
                  (new Date(session.endsAt).getTime() -
                    new Date(session.startsAt).getTime()) /
                    60_000,
                ),
              ),
              capacity: String(session.capacity),
              room: session.room ?? "",
              note: session.note ?? "",
            }}
            submitLabel="Lưu lớp"
            pending={update.isPending}
            error={update.error}
            onCancel={() => setEditing(false)}
            onSubmit={async (input) => {
              const saved = await update.mutateAsync(input);
              setEditing(false);
              onDone(
                `Đã lưu lớp. ${weekdayLong(saved.startsAt)}, ${formatTimeRange(saved.startsAt, saved.endsAt)}, ${saved.trainer.fullName}.`,
              );
              return saved;
            }}
          />
        </DialogContent>
      </Dialog>

      <CancelClassDialog
        session={session}
        bookedCount={bookedCount}
        open={cancelling}
        onOpenChange={setCancelling}
        onDone={onDone}
      />
    </>
  );
}

/**
 * Cancelling states its consequence before the button and asks for a reason,
 * because the reason is what staff will tell the students who were booked. It is
 * one-way on purpose: re-running the buổi is a new class, not an un-cancel.
 */
function CancelClassDialog({
  session,
  bookedCount,
  open,
  onOpenChange,
  onDone,
}: {
  session: ClassSession;
  bookedCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const cancel = useCancelClass(session.id);
  const tooShort = reason.trim().length < 6;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) cancel.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent
        title="Hủy lớp"
        description={
          bookedCount === 0
            ? "Chưa có ai đăng ký, nhưng lớp đã hủy thì không mở lại được — mở lại là một lớp mới."
            : `${bookedCount} học viên đang đăng ký buổi này. Hủy rồi không mở lại được, và studio phải tự thông báo cho họ.`
        }
      >
        <div className="flex flex-col gap-4">
          <dl className="rule-b text-ink-2 flex flex-wrap items-baseline gap-x-6 gap-y-1 pb-3 text-xs">
            <div className="flex items-baseline gap-2">
              <dt>Buổi</dt>
              <dd className="text-ink">
                {weekdayLong(session.startsAt)},{" "}
                <Figures>{formatDate(session.startsAt)}</Figures>{" "}
                <Figures>{formatTimeRange(session.startsAt, session.endsAt)}</Figures>
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Huấn luyện viên</dt>
              <dd className="text-ink">{session.trainer.fullName}</dd>
            </div>
          </dl>

          <Field
            label="Lý do hủy"
            required
            hint="Đây là điều studio sẽ nói với học viên đã đăng ký."
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

          {cancel.error ? (
            <p role="alert" className="text-danger text-sm">
              Chưa hủy được lớp. Vui lòng thử lại sau ít phút.
            </p>
          ) : null}

          <FormActions>
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Không hủy
            </Button>
            <Button
              size="sm"
              variant="danger"
              pending={cancel.isPending}
              disabled={tooShort}
              onClick={() => {
                cancel.mutate(
                  { reason: reason.trim() },
                  {
                    onSuccess: () => {
                      onOpenChange(false);
                      onDone("Đã hủy lớp. Học viên đã đăng ký cần được thông báo.");
                    },
                  },
                );
              }}
            >
              Hủy lớp này
            </Button>
          </FormActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Changing who teaches, and nothing else.
 *
 * The edit form can do this too, but reassignment is the change staff make most
 * often and it is one decision — asking them to scroll nine fields for it is how
 * someone ends up altering a capacity they did not mean to touch. The clash rule
 * is the same one (CONFIRMED, Q4), so the refusal names the class it collided
 * with here as well.
 */
function ReassignTrainerDialog({
  session,
  trainers,
  open,
  onOpenChange,
  onDone,
}: {
  session: ClassSession;
  trainers: Trainer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (message: string) => void;
}) {
  const [trainerId, setTrainerId] = useState(session.trainer.id);
  const update = useUpdateClass(session.id);
  const conflict = readTrainerConflict(update.error);
  const unchanged = trainerId === session.trainer.id;

  const assignable = trainers.filter((t) => t.active || t.id === session.trainer.id);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          update.reset();
          setTrainerId(session.trainer.id);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        title="Đổi huấn luyện viên"
        description={`${session.title} — ${weekdayLong(session.startsAt)}, ${formatTimeRange(session.startsAt, session.endsAt)}. Giờ, sức chứa và ghi chú của lớp không thay đổi.`}
      >
        <div className="flex flex-col gap-4">
          <Field label="Huấn luyện viên" required>
            {({ id }) => (
              <Select
                id={id}
                value={trainerId}
                aria-invalid={conflict !== null}
                onChange={(event) => setTrainerId(event.target.value)}
              >
                {assignable.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.fullName}
                    {trainer.active ? "" : " (đã nghỉ)"}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {conflict ? (
            <div role="alert">
              <p className="text-danger text-sm">
                {conflict.trainerName} đã có lớp trong khoảng giờ này.
              </p>
              <p className="text-ink-2 mt-1.5 text-xs">
                Trùng với <span className="text-ink">{conflict.title}</span> —{" "}
                {weekdayLong(conflict.startsAt)}{" "}
                <Figures className="text-ink">
                  {formatTimeRange(conflict.startsAt, conflict.endsAt)}
                </Figures>
                . Chọn người khác, hoặc đổi giờ lớp này ở “Sửa lớp”.
              </p>
            </div>
          ) : null}

          {update.error && conflict === null ? (
            <p role="alert" className="text-danger text-sm">
              Chưa đổi được huấn luyện viên. Vui lòng thử lại sau ít phút.
            </p>
          ) : null}

          <FormActions>
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button
              size="sm"
              pending={update.isPending}
              disabled={unchanged}
              onClick={() => {
                update.mutate(
                  {
                    title: session.title,
                    type: session.type,
                    trainerId,
                    date: studioDateKey(session.startsAt),
                    startTime: formatTime(session.startsAt),
                    durationMinutes: Math.round(
                      (new Date(session.endsAt).getTime() -
                        new Date(session.startsAt).getTime()) /
                        60_000,
                    ),
                    capacity: session.capacity,
                    room: session.room,
                    note: session.note,
                  },
                  {
                    onSuccess: (saved) => {
                      onOpenChange(false);
                      onDone(`Lớp này giờ do ${saved.trainer.fullName} phụ trách.`);
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
 * The roster, and the three things staff do to it on a student's behalf.
 *
 * Split out of the screen body so the mutation hooks and the dialog state live
 * next to the list they act on, rather than at the top of a component that also
 * owns the header.
 */
function RosterSection({
  session,
  roster,
  onDone,
}: {
  session: ClassSession;
  roster: ClassRoster;
  onDone: (message: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [cancelling, setCancelling] = useState<RosterEntry | null>(null);
  const [rescheduling, setRescheduling] = useState<RosterEntry | null>(null);
  const students = useStudents("", "all");

  const editable = session.status !== "cancelled";
  const free = session.capacity - session.bookedCount;

  return (
    <section className="mt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="flex items-baseline gap-2">
          <span className="text-ink text-sm font-medium">Học viên đã đăng ký</span>
          <Figures className="text-ink-2 text-xs">{roster.booked.length}</Figures>
        </h2>
        {editable ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={free <= 0}
            onClick={() => setAdding(true)}
          >
            {free <= 0 ? "Lớp đã đủ chỗ" : "Thêm học viên"}
          </Button>
        ) : null}
      </div>

      {roster.booked.length === 0 ? (
        <p className="rule-t text-ink-2 mt-3 py-8 text-sm">
          Chưa có học viên nào đăng ký buổi này.
        </p>
      ) : (
        <ul className="rule-t mt-3">
          {roster.booked.map((entry) => (
            <li key={entry.bookingId} className="rule-b">
              <BookedRow
                entry={entry}
                editable={editable}
                onCancel={() => setCancelling(entry)}
                onReschedule={() => setRescheduling(entry)}
              />
            </li>
          ))}
        </ul>
      )}

      <AddStudentDialog
        session={session}
        roster={[...roster.booked, ...roster.waitlist]}
        students={students.data ?? []}
        open={adding}
        onOpenChange={setAdding}
        onDone={onDone}
      />
      <CancelBookingDialog
        session={session}
        entry={cancelling}
        onClose={() => setCancelling(null)}
        onDone={onDone}
      />
      <RescheduleDialog
        session={session}
        entry={rescheduling}
        onClose={() => setRescheduling(null)}
        onDone={onDone}
      />
    </section>
  );
}
