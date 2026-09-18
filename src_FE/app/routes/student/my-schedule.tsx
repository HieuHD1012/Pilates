import { useState } from "react";
import { Link } from "react-router";

import { refusalCopy } from "~/features/booking/booking-copy";
import {
  useBookableClasses,
  useCancelBooking,
  useChangeBooking,
  useMySchedule,
} from "~/features/booking/queries";
import type { MyScheduleItem } from "~/lib/api/schema";
import {
  addDays,
  formatDate,
  formatLeadTime,
  formatTime,
  formatTimeRange,
  studioDateKey,
  weekdayLong,
} from "~/lib/format";
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
  const query = useMySchedule();
  // `GET /my-schedule` without `include_cancelled` still returns finished
  // classes; the live ones are the bookings still being held.
  const items = (query.data ?? []).filter((item) => item.booking_status === "BOOKED");
  const [changing, setChanging] = useState<MyScheduleItem | null>(null);
  const [cancelling, setCancelling] = useState<MyScheduleItem | null>(null);
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

        <ChangeBookingDialog
          booking={changing}
          onClose={() => setChanging(null)}
          onDone={(message) => {
            setChanging(null);
            setNotice(message);
          }}
        />

        <CancelBookingDialog
          booking={cancelling}
          onClose={() => setCancelling(null)}
          onDone={(message) => {
            setCancelling(null);
            setNotice(message);
          }}
        />

        {query.isSuccess && items.length > 0 ? (
          <ul className="rule-t">
            {items.map((item) => (
              <li key={item.booking_id} className="rule-b py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-ink-2 text-xs">
                      {weekdayLong(item.starts_at)} · {formatDate(item.starts_at)}
                    </p>
                    <p className="figures text-ink mt-1 text-base">
                      {formatTimeRange(item.starts_at, item.ends_at)}
                    </p>
                    <p className="text-ink mt-1 text-sm">
                      {item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
                    </p>
                    <p className="text-ink-2 mt-0.5 text-xs">{item.trainer_name}</p>
                  </div>
                  {item.session_status === "CANCELLED" ? (
                    <StatusBadge tone="critical">Studio đã hủy</StatusBadge>
                  ) : (
                    <StatusBadge tone="positive">Đã đặt</StatusBadge>
                  )}
                </div>

                {/* Both facts come decided: `refund_if_cancelled_now` folds
                    three rules together, and `can_cancel` is the deadline
                    already applied. Neither is recomputed here. */}
                <p className="text-ink-2 mt-3 text-xs">
                  Bắt đầu sau {formatLeadTime(item.starts_at)} ·{" "}
                  {item.refund_if_cancelled_now
                    ? "hủy bây giờ vẫn được hoàn buổi"
                    : "hủy bây giờ sẽ không được hoàn buổi"}
                </p>

                {item.can_cancel ? (
                  <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <button
                      type="button"
                      onClick={() => setChanging(item)}
                      className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-sm underline underline-offset-[6px]"
                    >
                      Đổi buổi
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelling(item)}
                      className="text-ink-2 decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-sm underline underline-offset-[6px]"
                    >
                      Hủy buổi
                    </button>
                  </p>
                ) : (
                  <p className="text-ink-2 mt-3 text-xs">
                    Hạn tự đổi hoặc tự hủy là {formatTime(item.cancel_deadline)}{" "}
                    {formatDate(item.cancel_deadline)}. Nhắn studio nếu bạn cần thay đổi.
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A student moving their own buổi.
 *
 * There is no "which classes may this booking move to" endpoint: the student
 * picks any upcoming class their packages can pay for, and
 * `POST /bookings/{id}/change` accepts or refuses it as one transaction. The
 * list below is therefore the same bookable list the class screen shows — not
 * a second, narrower idea of what is allowed.
 */
function ChangeBookingDialog({
  booking,
  onClose,
  onDone,
}: {
  booking: MyScheduleItem | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [targetId, setTargetId] = useState("");
  const today = studioDateKey(new Date());
  const candidates = useBookableClasses({ from: today, to: addDays(today, 14) });
  const change = useChangeBooking();

  const options = (candidates.data ?? []).filter(
    (item) => item.canBook && item.id !== booking?.class_session_id,
  );

  return (
    <Dialog
      open={booking !== null}
      onOpenChange={(next) => {
        if (!next) {
          change.reset();
          setTargetId("");
          onClose();
        }
      }}
    >
      {booking ? (
        <DialogContent
          title="Đổi buổi"
          description={`Bạn đang đặt ${weekdayLong(booking.starts_at)} ${formatTimeRange(booking.starts_at, booking.ends_at)}. Đổi buổi không trừ thêm buổi nào.`}
        >
          <div className="flex flex-col gap-4">
            {candidates.isPending ? (
              <SkeletonRows rows={2} />
            ) : options.length === 0 ? (
              <p className="measure text-ink-2 text-sm">
                Hiện không còn buổi nào bạn đặt được bằng gói đang có. Nhắn studio nếu bạn
                cần xếp lại.
              </p>
            ) : (
              <Field label="Đổi sang buổi" required>
                {({ id }) => (
                  <Select
                    id={id}
                    value={targetId}
                    onChange={(event) => setTargetId(event.target.value)}
                  >
                    <option value="">— Chọn buổi —</option>
                    {options.map((option) => (
                      <option key={option.id} value={String(option.id)}>
                        {weekdayLong(option.starts_at)} {formatDate(option.starts_at)}{" "}
                        {formatTimeRange(option.starts_at, option.ends_at)} ·{" "}
                        {option.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}

            {change.error ? (
              <p role="alert" className="text-danger text-sm">
                {refusalCopy(change.error).title}
              </p>
            ) : null}

            <FormActions>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Để nguyên
              </Button>
              <Button
                size="sm"
                pending={change.isPending}
                disabled={targetId === ""}
                onClick={() => {
                  change.mutate(
                    {
                      bookingId: booking.booking_id,
                      newClassSessionId: Number(targetId),
                    },
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
function CancelBookingDialog({
  booking,
  onClose,
  onDone,
}: {
  booking: MyScheduleItem | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const cancel = useCancelBooking();
  const refundable = booking?.refund_if_cancelled_now ?? false;

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
          description={`${weekdayLong(booking.starts_at)} ${formatTimeRange(booking.starts_at, booking.ends_at)}.`}
        >
          <div className="flex flex-col gap-4">
            <p className="measure text-ink text-sm">
              {refundable
                ? "Bạn đang hủy trong hạn, nên buổi này sẽ được hoàn lại vào gói."
                : "Đã qua hạn hoàn buổi, nên buổi này sẽ không được hoàn lại."}
            </p>

            {cancel.error ? (
              <p role="alert" className="text-danger text-sm">
                {refusalCopy(cancel.error).title}
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
                  cancel.mutate(booking.booking_id, {
                    onSuccess: (result) =>
                      onDone(
                        result.refunded
                          ? `Đã hủy buổi. Gói của bạn còn ${result.credits_remaining} buổi.`
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
