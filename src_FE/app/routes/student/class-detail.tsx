import { useState } from "react";
import { Link, useParams } from "react-router";

import { eligibilityCopy, primaryReason } from "~/features/booking/eligibility-copy";
import {
  useBookableClass,
  useBookClass,
  useStudentPackages,
} from "~/features/booking/queries";
import { ApiError } from "~/lib/api/client";
import {
  formatDate,
  formatLeadTime,
  formatTime,
  formatTimeRange,
  weekdayLong,
} from "~/lib/format";
import { Button } from "~/ui/button";
import { Dialog, DialogContent } from "~/ui/dialog";
import { ErrorState, LiveRegion, Skeleton } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { CapacityMeter, StatusBadge } from "~/ui/status";

import type { Route } from "./+types/class-detail";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Chi tiết lớp — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * REFERENCE C, part two — the transaction.
 *
 * The rules this screen establishes for every mutation in the product:
 *   1. State the consequence BEFORE the action: what is deducted, and what the
 *      balance becomes.
 *   2. State the exit terms before entry: when this booking stops being
 *      refundable, in the backend's own numbers.
 *   3. Never optimistically apply a transaction the backend has not confirmed.
 *   4. Render the backend's refusal as a sentence the student can act on.
 */
export default function ClassDetail() {
  const { classId = "" } = useParams();
  const query = useBookableClass(classId);
  const packages = useStudentPackages();
  const booking = useBookClass();
  const [confirming, setConfirming] = useState(false);

  const activePackage = (packages.data ?? []).find((item) => item.status === "active");
  const item = query.data;

  if (query.isPending) {
    return (
      <div className="gutter mx-auto max-w-(--container-column) py-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-8 w-64" />
        <Skeleton className="mt-6 h-40 w-full" />
        <span className="sr-only">Đang tải thông tin lớp</span>
      </div>
    );
  }

  if (query.isError || !item) {
    return (
      <div className="gutter mx-auto max-w-(--container-column) py-6">
        <ErrorState
          title="Không mở được lớp này"
          description="Lớp có thể đã bị hủy hoặc đường dẫn không còn đúng."
          onRetry={() => void query.refetch()}
        />
        <div className="mt-6">
          <Button asChild variant="secondary">
            <Link to="/hv/lop-hoc">Quay lại danh sách lớp</Link>
          </Button>
        </div>
      </div>
    );
  }

  const reason = item.eligibility.canBook ? null : primaryReason(item.eligibility.reasons);
  const copy = reason ? eligibilityCopy(reason) : null;
  const cost = item.eligibility.sessionCost ?? 1;
  const remaining = activePackage?.sessionsRemaining ?? null;
  const booked = booking.isSuccess;

  return (
    <div className="gutter mx-auto max-w-(--container-column) py-5">
      <LiveRegion
        message={
          booked
            ? "Đặt lớp thành công."
            : booking.isError
              ? "Đặt lớp không thành công."
              : null
        }
      />

      <Link
        to="/hv/lop-hoc"
        className="text-ink-2 decoration-rule-2 hover:text-ink text-xs underline underline-offset-[6px]"
      >
        Danh sách lớp
      </Link>

      <header className="mt-4">
        <p className="label-micro">
          {weekdayLong(item.startsAt)} · {formatDate(item.startsAt)}
        </p>
        <h1 className="font-display text-d3 text-ink mt-2 font-light">{item.title}</h1>
        <p className="figures text-ink mt-2 text-lg">
          {formatTimeRange(item.startsAt, item.endsAt)}
        </p>
      </header>

      <dl className="rule-t mt-6">
        <Row label="Hình thức">
          {item.type === "private" ? "Lớp riêng (1 kèm 1)" : "Lớp nhóm"}
        </Row>
        <Row label="Huấn luyện viên">{item.trainer.fullName}</Row>
        <Row label="Chỗ trống">
          <CapacityMeter booked={item.bookedCount} capacity={item.capacity} />
        </Row>
        <Row label="Bắt đầu sau">{formatLeadTime(item.startsAt)}</Row>
      </dl>

      {/* The consequence, before the action. */}
      <section className="rule-t mt-8 pt-5">
        <h2 className="text-ink text-sm font-medium">Khi bạn đặt lớp này</h2>
        <dl className="mt-3">
          <Row label="Trừ vào gói">
            <Figures>{cost}</Figures> buổi
          </Row>
          {remaining !== null ? (
            <Row label="Số buổi còn lại">
              <span className="flex items-baseline gap-2">
                <Figures className="text-ink-2 line-through">{remaining}</Figures>
                <span aria-hidden="true" className="text-ink-3">
                  →
                </span>
                <Figures className="text-ink">{Math.max(remaining - cost, 0)}</Figures>
              </span>
            </Row>
          ) : null}
          {item.cancellationPreview?.deadlineAt ? (
            <Row label="Hủy được hoàn buổi">
              trước <Figures>{formatTime(item.cancellationPreview.deadlineAt)}</Figures>{" "}
              ngày <Figures>{formatDate(item.cancellationPreview.deadlineAt)}</Figures>
              {item.cancellationPreview.policyHours ? (
                <span className="text-ink-2 ml-1">
                  (trước <Figures>{item.cancellationPreview.policyHours}</Figures> giờ)
                </span>
              ) : null}
            </Row>
          ) : null}
        </dl>
      </section>

      {booked ? (
        <div className="rule-t border-t-success mt-8 pt-5">
          <p className="text-ink flex items-center gap-2 text-base">
            <StatusBadge tone="positive">Đã đặt</StatusBadge>
            Bạn đã có chỗ trong buổi này.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/hv/lich-cua-toi">Xem lịch của tôi</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/hv/lop-hoc">Đặt thêm lớp khác</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rule-t mt-8 pt-5">
          {copy ? (
            <div className="mb-5">
              <p className="text-ink text-base">{copy.title}</p>
              {copy.hint ? <p className="text-ink-2 mt-1 text-sm">{copy.hint}</p> : null}
            </div>
          ) : null}

          {booking.isError ? (
            <p role="alert" className="text-danger mb-5 text-sm">
              {booking.error instanceof ApiError && booking.error.isConflict
                ? eligibilityCopy(booking.error.code).title
                : "Chưa đặt được lớp này. Vui lòng thử lại."}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              disabled={!item.eligibility.canBook}
              pending={booking.isPending}
              onClick={() => setConfirming(true)}
            >
              Đặt lớp này
            </Button>
            {item.eligibility.canJoinWaitlist ? (
              <Button
                size="lg"
                variant="secondary"
                disabled
                title="Danh sách chờ thuộc giai đoạn tiếp theo"
              >
                Đăng ký chờ
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          title="Xác nhận đặt lớp"
          description={`${item.title} · ${weekdayLong(item.startsAt)} ${formatDate(item.startsAt)}`}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
                Quay lại
              </Button>
              <Button
                size="sm"
                pending={booking.isPending}
                onClick={() =>
                  booking
                    .mutateAsync(item.id)
                    .then(() => setConfirming(false))
                    .catch(() => setConfirming(false))
                }
              >
                Xác nhận đặt
              </Button>
            </>
          }
        >
          <p className="text-ink-2 text-sm">
            Buổi tập bắt đầu lúc{" "}
            <Figures className="text-ink">
              {formatTimeRange(item.startsAt, item.endsAt)}
            </Figures>
            . Gói của bạn sẽ bị trừ <Figures className="text-ink">{cost}</Figures> buổi.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rule-b grid grid-cols-[9rem_1fr] items-baseline gap-3 py-3 last:border-b-0">
      <dt className="text-ink-2 text-xs">{label}</dt>
      <dd className="text-ink text-sm">{children}</dd>
    </div>
  );
}
