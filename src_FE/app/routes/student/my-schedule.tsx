import { useState } from "react";
import { Link } from "react-router";

import {
  useCancelBooking,
  useStudentBookings,
  useStudentReschedule,
  useStudentRescheduleOptions,
} from "~/features/booking/queries";
import type { Booking } from "~/lib/api/types";
import { formatDate, formatLeadTime, formatTimeRange, weekdayLong } from "~/lib/format";
import { Button } from "~/ui/button";
import { Dialog, DialogContent } from "~/ui/dialog";
import { EmptyState, ErrorState, LiveRegion, SkeletonRows } from "~/ui/feedback";
import { Field, FormActions, Select } from "~/ui/field";
import { StatusBadge } from "~/ui/status";

import type { Route } from "./+types/my-schedule";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Lịch của tôi — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

export default function MySchedule() {
  const query = useStudentBookings("upcoming");
  const items = query.data ?? [];
  const [rescheduling, setRescheduling] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="gutter mx-auto max-w-(--container-column) py-5">
      <h1 className="text-ink text-xl font-medium">Lịch của tôi</h1>
      <p className="measure text-ink-2 mt-1 text-sm">
        Các buổi bạn đã đặt. Hủy đúng hạn để được hoàn lại buổi tập vào gói.
      </p>

      <div className="mt-6">
        {query.isPending ? <SkeletonRows rows={3} /> : null}

        {query.isError ? (
          <ErrorState
            description="Không tải được lịch của bạn."
            onRetry={() => void query.refetch()}
          />
        ) : null}

        {query.isSuccess && items.length === 0 ? (
          <EmptyState
            title="Bạn chưa đặt buổi nào"
            description="Chọn một buổi phù hợp trong danh sách lớp để bắt đầu."
            action={
              <Button asChild>
                <Link to="/hv/lop-hoc">Xem lớp học</Link>
              </Button>
            }
          />
        ) : null}

        <LiveRegion message={notice} />

        <StudentRescheduleDialog
          booking={rescheduling}
          onClose={() => setRescheduling(null)}
          onDone={(message) => {
            setRescheduling(null);
            setNotice(message);
          }}
        />

        <StudentCancelDialog
          booking={cancelling}
          onClose={() => setCancelling(null)}
          onDone={(message) => {
            setCancelling(null);
            setNotice(message);
          }}
        />

        {query.isSuccess && items.length > 0 ? (
          <ul className="rule-t">
            {items.map((booking) => {
              const item = booking.classSession;
              const refundable = booking.cancellation?.refundable ?? false;

              return (
                <li key={booking.id} className="rule-b py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-ink-2 text-xs">
                        {weekdayLong(item.startsAt)} · {formatDate(item.startsAt)}
                      </p>
                      <p className="figures text-ink mt-1 text-base">
                        {formatTimeRange(item.startsAt, item.endsAt)}
                      </p>
                      <p className="text-ink mt-1 text-sm">{item.title}</p>
                      <p className="text-ink-2 mt-0.5 text-xs">
                        {item.type === "private" ? "Lớp riêng" : "Lớp nhóm"} ·{" "}
                        {item.trainer.fullName}
                      </p>
                    </div>
                    <StatusBadge tone="positive">Đã đặt</StatusBadge>
                  </div>

                  <p className="text-ink-2 mt-3 text-xs">
                    Bắt đầu sau {formatLeadTime(item.startsAt)} ·{" "}
                    {refundable
                      ? "hủy bây giờ vẫn được hoàn buổi"
                      : "hủy bây giờ sẽ không được hoàn buổi"}
                  </p>

                  {/* The hook and the endpoint have existed since booking was
                      built; nothing on this screen had ever called them, so a
                      student could book a buổi and then not get out of it. */}
                  {booking.cancellation?.cancellable ? (
                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <button
                        type="button"
                        onClick={() => setRescheduling(booking)}
                        className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-sm underline underline-offset-[6px]"
                      >
                        Đổi buổi
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancelling(booking)}
                        className="text-ink-2 decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-sm underline underline-offset-[6px]"
                      >
                        Hủy buổi
                      </button>
                    </p>
                  ) : (
                    <p className="text-ink-2 mt-3 text-xs">
                      Đã qua hạn tự đổi hoặc tự hủy. Nhắn studio nếu bạn cần thay đổi.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A student moving their own buổi.
 *
 * The window is the studio's cancellation policy: past the deadline a student
 * cannot move a booking either, because moving out of a buổi they would not be
 * refunded for is the same decision as cancelling it. Staff can still act, and
 * the copy says so rather than leaving a dead control on the screen.
 */
function StudentRescheduleDialog({
  booking,
  onClose,
  onDone,
}: {
  booking: Booking | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [targetClassId, setTargetClassId] = useState("");
  const options = useStudentRescheduleOptions(booking?.id ?? null);
  const move = useStudentReschedule();
  const items = options.data?.items ?? [];

  return (
    <Dialog
      open={booking !== null}
      onOpenChange={(next) => {
        if (!next) {
          move.reset();
          setTargetClassId("");
          onClose();
        }
      }}
    >
      {booking ? (
        <DialogContent
          title="Đổi buổi"
          description={`Bạn đang đặt ${booking.classSession.title}, ${weekdayLong(booking.classSession.startsAt)} ${formatTimeRange(booking.classSession.startsAt, booking.classSession.endsAt)}. Đổi buổi không trừ thêm buổi nào.`}
        >
          <div className="flex flex-col gap-4">
            {options.isPending ? (
              <SkeletonRows rows={2} />
            ) : items.length === 0 ? (
              <p className="measure text-ink-2 text-sm">
                Hiện không còn buổi nào cùng hình thức lớp, còn chỗ và chưa diễn ra. Nhắn
                studio nếu bạn cần xếp lại.
              </p>
            ) : (
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
                        {formatTimeRange(option.startsAt, option.endsAt)} · {option.title} ·{" "}
                        {option.trainerName}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}

            {move.error ? (
              <p role="alert" className="text-danger text-sm">
                Chưa đổi được buổi. Buổi bạn chọn có thể vừa hết chỗ — thử lại hoặc chọn
                buổi khác.
              </p>
            ) : null}

            <FormActions>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Để nguyên
              </Button>
              <Button
                size="sm"
                pending={move.isPending}
                disabled={targetClassId === ""}
                onClick={() => {
                  move.mutate(
                    { bookingId: booking.id, targetClassId },
                    { onSuccess: () => onDone("Đã đổi buổi. Không trừ thêm buổi nào.") },
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

/** Cancelling states which way the refund will go before the button, not after. */
function StudentCancelDialog({
  booking,
  onClose,
  onDone,
}: {
  booking: Booking | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const cancel = useCancelBooking();
  const refundable = booking?.cancellation?.refundable ?? false;

  return (
    <Dialog
      open={booking !== null}
      onOpenChange={(next) => {
        if (!next) {
          cancel.reset();
          onClose();
        }
      }}
    >
      {booking ? (
        <DialogContent
          title="Hủy buổi này"
          description={`${booking.classSession.title}, ${weekdayLong(booking.classSession.startsAt)} ${formatTimeRange(booking.classSession.startsAt, booking.classSession.endsAt)}.`}
        >
          <div className="flex flex-col gap-4">
            <p className="measure text-ink text-sm">
              {refundable
                ? "Bạn đang hủy trong hạn, nên buổi này sẽ được hoàn lại vào gói."
                : "Đã qua hạn hoàn buổi, nên buổi này sẽ không được hoàn lại."}
            </p>

            {cancel.error ? (
              <p role="alert" className="text-danger text-sm">
                Chưa hủy được buổi. Vui lòng thử lại sau ít phút.
              </p>
            ) : null}

            <FormActions>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Giữ buổi
              </Button>
              <Button
                size="sm"
                variant="danger"
                pending={cancel.isPending}
                onClick={() => {
                  cancel.mutate(booking.id, {
                    onSuccess: (result) =>
                      onDone(
                        result.refunded
                          ? `Đã hủy buổi và hoàn lại ${result.sessionsReturned} buổi vào gói.`
                          : "Đã hủy buổi. Ngoài hạn hoàn buổi nên không hoàn lại.",
                      ),
                  });
                }}
              >
                Hủy buổi
              </Button>
            </FormActions>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
