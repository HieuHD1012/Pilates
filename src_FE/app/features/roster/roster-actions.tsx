import { useState } from "react";

import { ApiError } from "~/lib/api/client";
import type { ClassSession, RosterEntry, StudentSummary } from "~/lib/api/types";
import { formatDate, formatTimeRange, weekdayLong } from "~/lib/format";
import { Button } from "~/ui/button";
import { Dialog, DialogContent } from "~/ui/dialog";
import { Field, FormActions, Select } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { QueryBoundary } from "~/ui/query-boundary";

import {
  useRescheduleOptions,
  useStaffBookForStudent,
  useStaffCancelBooking,
  useStaffRescheduleBooking,
} from "./queries";

/**
 * Staff acting for a student, on the class they are looking at.
 *
 * Q5 treats this as confirmed: staff and trainers may book, cancel and move on a
 * student's behalf. What the studio has NOT said is that staff may override the
 * rules, so nothing here does — a full class, a past buổi and an empty package
 * refuse for staff exactly as they refuse for a student, and the refusal is
 * spelled out rather than reported as a code.
 */

/** Every refusal the backend can return here, in words the studio can act on. */
const REFUSAL: Record<string, string> = {
  already_booked: "Học viên này đã có trong lớp.",
  class_cancelled: "Lớp này đã hủy.",
  booking_closed: "Buổi này đã qua, không đặt thêm được.",
  class_full: "Lớp đã đủ chỗ.",
  no_sessions_remaining: "Học viên không còn buổi trong gói. Ghi nhận gói mới trước.",
  already_cancelled: "Lượt đặt này đã hủy.",
};

function refusalText(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  return REFUSAL[error.code] ?? "Chưa thực hiện được. Vui lòng thử lại sau ít phút.";
}

export function AddStudentDialog({
  session,
  roster,
  students,
  open,
  onOpenChange,
  onDone,
}: {
  session: ClassSession;
  roster: RosterEntry[];
  students: StudentSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (message: string) => void;
}) {
  const [studentId, setStudentId] = useState("");
  const book = useStaffBookForStudent(session.id);
  const refusal = refusalText(book.error);

  // Anyone already in the class is not a candidate for being added to it.
  const inClass = new Set(
    roster
      .filter((e) => e.status === "booked" || e.status === "waitlisted")
      .map((e) => e.studentId),
  );
  const candidates = students
    .filter((s) => !inClass.has(s.id))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));

  const free = session.capacity - session.bookedCount;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          book.reset();
          setStudentId("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        title="Thêm học viên vào lớp"
        description={`${session.title} — ${weekdayLong(session.startsAt)}, ${formatTimeRange(session.startsAt, session.endsAt)}. Đặt thay học viên sẽ trừ một buổi trong gói của họ.`}
      >
        <div className="flex flex-col gap-4">
          <dl className="rule-b text-ink-2 flex items-baseline gap-2 pb-3 text-xs">
            <dt>Còn trống</dt>
            <dd>
              <Figures className="text-ink">{free}</Figures> chỗ
            </dd>
          </dl>

          {candidates.length === 0 ? (
            <p className="text-ink-2 text-sm">
              Mọi học viên trong danh sách đều đã có trong lớp này.
            </p>
          ) : (
            <Field
              label="Học viên"
              required
              hint="Chỉ hiện những học viên chưa có trong lớp."
            >
              {({ id }) => (
                <Select
                  id={id}
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                >
                  <option value="">— Chọn học viên —</option>
                  {candidates.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName}
                      {student.sessionsRemaining === null
                        ? " (chưa có gói)"
                        : ` (còn ${student.sessionsRemaining} buổi)`}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          {refusal ? (
            <p role="alert" className="text-danger text-sm">
              {refusal}
            </p>
          ) : null}

          <FormActions>
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button
              size="sm"
              pending={book.isPending}
              disabled={studentId === "" || free <= 0}
              onClick={() => {
                book.mutate(
                  { classId: session.id, studentId },
                  {
                    onSuccess: (entry) => {
                      onOpenChange(false);
                      onDone(`Đã thêm ${entry.fullName} vào lớp. Đã trừ 1 buổi.`);
                    },
                  },
                );
              }}
            >
              Thêm vào lớp
            </Button>
          </FormActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Cancelling one booking. The refund is the studio's policy, not a choice made
 * here, so the dialog says which way it will go before the button is pressed.
 */
export function CancelBookingDialog({
  session,
  entry,
  onClose,
  onDone,
}: {
  session: ClassSession;
  entry: RosterEntry | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const cancel = useStaffCancelBooking(session.id);
  const refusal = refusalText(cancel.error);

  return (
    <Dialog
      open={entry !== null}
      onOpenChange={(next) => {
        if (!next) {
          cancel.reset();
          onClose();
        }
      }}
    >
      {entry ? (
        <DialogContent
          title="Hủy lượt đặt"
          description={`${entry.fullName} — ${session.title}, ${weekdayLong(session.startsAt)} ${formatTimeRange(session.startsAt, session.endsAt)}.`}
        >
          <div className="flex flex-col gap-4">
            <p className="measure-wide text-ink-2 text-sm">
              Buổi có được hoàn lại hay không do chính sách hủy của studio quyết định, tính
              theo thời điểm hủy — không phải lựa chọn ở đây.
            </p>

            {refusal ? (
              <p role="alert" className="text-danger text-sm">
                {refusal}
              </p>
            ) : null}

            <FormActions>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Không hủy
              </Button>
              <Button
                size="sm"
                variant="danger"
                pending={cancel.isPending}
                onClick={() => {
                  cancel.mutate(entry.bookingId, {
                    onSuccess: (result) => {
                      onClose();
                      onDone(
                        result.refunded
                          ? `Đã hủy lượt đặt của ${entry.fullName} và hoàn lại buổi.`
                          : `Đã hủy lượt đặt của ${entry.fullName}. Ngoài hạn hủy nên không hoàn buổi.`,
                      );
                    },
                  });
                }}
              >
                Hủy lượt đặt
              </Button>
            </FormActions>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

/**
 * Moving a booking to another buổi.
 *
 * The options come from the backend, so this screen never has to reason about
 * what counts as eligible. Rescheduling carries the session already charged —
 * moving a buổi is not buying another one.
 */
export function RescheduleDialog({
  session,
  entry,
  onClose,
  onDone,
}: {
  session: ClassSession;
  entry: RosterEntry | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [targetClassId, setTargetClassId] = useState("");
  const options = useRescheduleOptions(entry?.bookingId ?? null);
  const move = useStaffRescheduleBooking(session.id);
  const refusal = refusalText(move.error);

  return (
    <Dialog
      open={entry !== null}
      onOpenChange={(next) => {
        if (!next) {
          move.reset();
          setTargetClassId("");
          onClose();
        }
      }}
    >
      {entry ? (
        <DialogContent
          title="Đổi buổi"
          description={`${entry.fullName} đang ở ${session.title}, ${weekdayLong(session.startsAt)} ${formatTimeRange(session.startsAt, session.endsAt)}. Đổi buổi không trừ thêm buổi nào.`}
        >
          <div className="flex flex-col gap-4">
            <QueryBoundary
              query={options}
              skeletonRows={3}
              errorDescription="Không tải được danh sách buổi có thể đổi sang."
              emptyTitle="Không còn buổi nào phù hợp"
              emptyDescription="Cùng hình thức lớp, còn chỗ và chưa diễn ra — hiện không có buổi nào như vậy."
            >
              {(items) => (
                <Field label="Đổi sang buổi" required>
                  {({ id }) => (
                    <Select
                      id={id}
                      value={targetClassId}
                      onChange={(event) => setTargetClassId(event.target.value)}
                    >
                      <option value="">— Chọn buổi —</option>
                      {items.map((option) => (
                        <option key={option.classId} value={option.classId}>
                          {weekdayLong(option.startsAt)} {formatDate(option.startsAt)}{" "}
                          {formatTimeRange(option.startsAt, option.endsAt)} · {option.title}{" "}
                          · {option.trainerName} ({option.bookedCount}/{option.capacity})
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              )}
            </QueryBoundary>

            {refusal ? (
              <p role="alert" className="text-danger text-sm">
                {refusal}
              </p>
            ) : null}

            <FormActions>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Huỷ
              </Button>
              <Button
                size="sm"
                pending={move.isPending}
                disabled={targetClassId === ""}
                onClick={() => {
                  move.mutate(
                    { bookingId: entry.bookingId, targetClassId },
                    {
                      onSuccess: () => {
                        onClose();
                        onDone(`Đã đổi buổi cho ${entry.fullName}.`);
                      },
                    },
                  );
                }}
              >
                Đổi buổi
              </Button>
            </FormActions>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

/** Exported so the refusal wording is testable without mounting three dialogs. */
export { refusalText };
