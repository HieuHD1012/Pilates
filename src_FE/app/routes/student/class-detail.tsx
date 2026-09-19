import { useState } from "react";
import { Link, useParams } from "react-router";

import { refusalCopy } from "~/features/booking/booking-copy";
import {
  useBookableIds,
  useBookClass,
  useClassSession,
  useMySchedule,
} from "~/features/booking/queries";
import { useStudentPackages } from "~/features/commerce/queries";
import { formatDate, formatLeadTime, formatTimeRange, weekdayLong } from "~/lib/format";
import { Button } from "~/ui/button";
import { Dialog, DialogContent } from "~/ui/dialog";
import { ErrorState, LiveRegion, Skeleton } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { StatusBadge } from "~/ui/status";

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
 *   2. State the exit terms where the backend states them. The cancellation
 *      deadline is only computed for a booking that exists, so this screen
 *      says where it will appear rather than printing a policy of its own.
 *   3. Never optimistically apply a transaction the backend has not confirmed.
 *   4. Render the backend's refusal as a sentence the student can act on.
 */
export default function ClassDetail() {
  const { classId = "" } = useParams();
  const sessionId = Number(classId);
  const query = useClassSession(sessionId);
  const bookable = useBookableIds();
  const mySchedule = useMySchedule();
  const packages = useStudentPackages();
  const booking = useBookClass();
  const [confirming, setConfirming] = useState(false);

  const activePackage = (packages.data ?? []).find((item) => item.status === "ACTIVE");
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

  /**
   * `GET /my-schedule/bookable` is the eligibility answer: the ids this
   * student's packages can actually pay for. While it is loading the button
   * stays disabled rather than guessing in either direction.
   */
  const canBook = (bookable.data ?? []).includes(sessionId);
  // A booking always costs exactly one credit; the backend deducts one.
  const cost = 1;
  const remaining = activePackage?.balance_cached ?? null;
  const hasRoom = item.seats_left > 0;

  /**
   * A seat this student already holds.
   *
   * `/my-schedule/bookable` excludes a class they are already in, so without
   * this the screen reads that exclusion as an eligibility problem and tells
   * someone who did nothing wrong that their package does not cover the class
   * they are already booked into.
   */
  const alreadyBooked = (mySchedule.data ?? []).some(
    (row) => row.class_session_id === sessionId && row.booking_status === "BOOKED",
  );
  const booked = booking.isSuccess || alreadyBooked;

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
          {weekdayLong(item.starts_at)} · {formatDate(item.starts_at)}
        </p>
        <h1 className="font-display text-d3 text-ink mt-2 font-light">
          {item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"}
        </h1>
        <p className="figures text-ink mt-2 text-lg">
          {formatTimeRange(item.starts_at, item.ends_at)}
        </p>
      </header>

      <dl className="rule-t mt-6">
        <Row label="Hình thức">
          {item.class_type === "PRIVATE" ? "Lớp riêng (1 kèm 1)" : "Lớp nhóm"}
        </Row>
        <Row label="Huấn luyện viên">{item.trainer_name}</Row>
        {/* `seats_left` reaches a student as 1 or 0 — room or no room. It is
            not a count, and printing it as one would say how empty the class
            is, which the studio deliberately does not publish. */}
        <Row label="Chỗ trống">
          {hasRoom ? (
            <StatusBadge tone="positive">Còn chỗ</StatusBadge>
          ) : (
            <StatusBadge tone="critical">Hết chỗ</StatusBadge>
          )}
        </Row>
        <Row label="Bắt đầu sau">{formatLeadTime(item.starts_at)}</Row>
      </dl>

      {/* The consequence, before the action — and only before it. Once the seat
          is held, a forecast of a balance that has already moved is noise. */}
      {booked ? null : (
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
            {/* The deadline is computed per booking, so it exists only once the
              booking does. Rather than restate the studio's policy here — a
              second copy that would drift the day it changes — this points at
              the row that will carry the backend's own number. */}
            <Row label="Hạn hủy">
              hiện trong <Link to="/hv/lich-cua-toi">Lịch của tôi</Link> sau khi đặt
            </Row>
          </dl>
        </section>
      )}

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
          {bookable.isSuccess && !canBook ? (
            <div className="mb-5">
              <p className="text-ink text-base">
                {hasRoom
                  ? "Gói tập hiện tại của bạn chưa dùng được cho buổi này."
                  : "Buổi này đã hết chỗ."}
              </p>
              <p className="text-ink-2 mt-1 text-sm">
                {hasRoom
                  ? "Liên hệ studio để được tư vấn gói phù hợp."
                  : "Bạn có thể chọn một buổi khác trong tuần."}
              </p>
            </div>
          ) : null}

          {booking.isError ? (
            <p role="alert" className="text-danger mb-5 text-sm">
              {refusalCopy(booking.error).title}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              disabled={!canBook}
              pending={booking.isPending}
              onClick={() => setConfirming(true)}
            >
              Đặt lớp này
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          title="Xác nhận đặt lớp"
          description={`${item.class_type === "PRIVATE" ? "Lớp riêng" : "Lớp nhóm"} · ${weekdayLong(item.starts_at)} ${formatDate(item.starts_at)}`}
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
                    .mutateAsync(sessionId)
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
              {formatTimeRange(item.starts_at, item.ends_at)}
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
