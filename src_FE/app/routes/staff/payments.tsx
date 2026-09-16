import { useState } from "react";
import { Link } from "react-router";

import {
  usePayments,
  useRecordPayment,
  useSetPaymentStatus,
} from "~/features/commerce/queries";
import { PaymentForm } from "~/features/commerce/payment-form";
import { useStudents } from "~/features/people/queries";
import type { Payment, PaymentMethod, PaymentStatus } from "~/lib/api/types";
import { addDays, formatDate, formatTime, formatVnd, studioDateKey } from "~/lib/format";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { Dialog, DialogContent } from "~/ui/dialog";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { LiveRegion } from "~/ui/feedback";
import { Field, FormActions, Input, Select, Textarea } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { FilterBar, PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";

import type { Route } from "./+types/payments";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Thanh toán — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The payments log — every amount the studio has recorded, in one date range.
 *
 * The winning subject is the transaction (P1): the amount column is the only
 * figure the eye is asked to compare down the page, and the student, the
 * reference and the method are attributes of that transaction.
 *
 * One reporting rule governs the header: **only confirmed transactions are
 * money**. A pending or voided row still appears in the table — staff need to
 * see it and chase it — but it is never summed. The authoritative revenue
 * figure is the report the backend computes; the total here is the sum of the
 * confirmed rows currently on screen, and it says so.
 *
 * Recording is on this screen, and so is the only correction path: a wrong record
 * is voided with a stated reason, never edited into looking right. A pending
 * record can be confirmed once someone has seen the money — without that, every
 * claimed transfer would stay invisible to the revenue report forever.
 */

const STATUS: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  confirmed: { label: "Đã xác nhận", tone: "positive" },
  pending: { label: "Chờ xác nhận", tone: "attention" },
  // A voided record is not a failure, it is a corrected entry. Neutral, not danger.
  void: { label: "Đã hủy", tone: "neutral" },
};

const STATUS_ORDER: PaymentStatus[] = ["confirmed", "pending", "void"];

/** The method is written in words: a cash icon says nothing a word does not. */
const METHOD: Record<PaymentMethod, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
};

/**
 * The month containing `dateKey`, as studio date keys. `addDays` walks the
 * calendar correctly across month and year ends, so the last day of a month is
 * simply the day before the first of the next one.
 */
function studioMonthRange(dateKey: string): { from: string; to: string } {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const from = `${dateKey.slice(0, 7)}-01`;
  const nextMonth =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { from, to: addDays(nextMonth, -1) };
}

export default function StaffPayments() {
  const thisMonth = studioMonthRange(studioDateKey(new Date()));
  const [from, setFrom] = useState(thisMonth.from);
  const [to, setTo] = useState(thisMonth.to);
  const [status, setStatus] = useState<PaymentStatus | "all">("all");
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const record = useRecordPayment();
  // The roster for the student picker, fetched up front so the dialog opens with
  // its options already there. It is a small, long-cached list.
  const roster = useStudents("", "all");

  const query = usePayments(from, to, status);
  const items = query.data;

  // The confirmed subset, and nothing else, is what the header reports.
  const confirmed = (items ?? []).filter((item) => item.status === "confirmed");
  const confirmedTotal = confirmed.reduce((sum, item) => sum + item.amount, 0);

  const rangeInvalid = from !== "" && to !== "" && from > to;
  const narrowed = status !== "all";

  function resetRange() {
    setFrom(thisMonth.from);
    setTo(thisMonth.to);
    setStatus("all");
  }

  return (
    <div className="gutter py-6">
      <PageHeader
        title="Thanh toán"
        description="Các khoản thu đã ghi nhận trong khoảng ngày đang chọn. Tổng tiền chỉ cộng những giao dịch đã xác nhận."
        actions={
          <>
            <Button asChild size="sm" variant="secondary">
              <Link to="/studio/bao-cao/doanh-thu">Báo cáo doanh thu</Link>
            </Button>
            <Button size="sm" onClick={() => setRecording(true)}>
              Ghi nhận khoản thu
            </Button>
          </>
        }
        meta={
          <dl className="text-ink-2 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-xs">
            <div className="flex items-baseline gap-2">
              <dt>Tổng tiền (đã xác nhận)</dt>
              <dd>
                {items ? (
                  <Figures className="text-ink whitespace-nowrap">
                    {formatVnd(confirmedTotal)}
                  </Figures>
                ) : (
                  <Placeholder />
                )}
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Giao dịch đã xác nhận</dt>
              <dd>
                {items ? (
                  <Figures className="text-ink">{confirmed.length}</Figures>
                ) : (
                  <Placeholder />
                )}
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Đang hiển thị</dt>
              <dd>
                {items ? (
                  <Figures className="text-ink">{items.length}</Figures>
                ) : (
                  <Placeholder />
                )}
              </dd>
            </div>
          </dl>
        }
      />

      <FilterBar
        trailing={
          <span className="text-ink-2 text-xs">
            {query.isFetching && !query.isPending ? "Đang cập nhật" : null}
          </span>
        }
      >
        <Field label="Từ ngày" className="w-full sm:w-40">
          {({ id }) => (
            <Input
              id={id}
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          )}
        </Field>

        <Field
          label="Đến ngày"
          className="w-full sm:w-40"
          error={rangeInvalid ? "Phải từ ngày bắt đầu trở đi." : undefined}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="date"
              value={to}
              min={from || undefined}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              onChange={(event) => setTo(event.target.value)}
            />
          )}
        </Field>

        <Field label="Trạng thái" className="w-full sm:w-48">
          {({ id }) => (
            <Select
              id={id}
              value={status}
              onChange={(event) => setStatus(event.target.value as PaymentStatus | "all")}
            >
              <option value="all">Tất cả</option>
              {STATUS_ORDER.map((value) => (
                <option key={value} value={value}>
                  {STATUS[value].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </FilterBar>

      <DemoDataNotice className="mb-3" />

      <QueryBoundary
        query={query}
        skeletonRows={8}
        showErrorDetail
        errorDescription="Không tải được danh sách thanh toán của khoảng ngày này."
        emptyTitle={
          narrowed
            ? "Không có giao dịch nào khớp bộ lọc"
            : "Chưa có giao dịch nào trong khoảng ngày này"
        }
        emptyDescription={
          narrowed
            ? "Bộ lọc trạng thái đang thu hẹp kết quả. Xem tất cả trạng thái hoặc mở rộng khoảng ngày."
            : "Các khoản thu do nhân viên ghi nhận sẽ xuất hiện ở đây, mới nhất trước."
        }
        emptyAction={
          <Button variant="secondary" onClick={resetRange}>
            Xem lại tháng này
          </Button>
        }
      >
        {(payments) => {
          // Newest first: a payments log is read from the most recent receipt.
          const sorted = [...payments].sort(
            (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
          );

          return (
            <>
              <div className="hidden lg:block">
                <PaymentTable payments={sorted} />
              </div>
              <div className="lg:hidden">
                <PaymentList payments={sorted} />
              </div>
            </>
          );
        }}
      </QueryBoundary>

      <div className="rule-t mt-6 pt-3">
        <p className="measure-wide text-ink-2 text-xs">
          Giao dịch chờ xác nhận và đã hủy vẫn hiển thị trong bảng nhưng không vào tổng
          tiền. Số liệu doanh thu chính thức lấy từ báo cáo, không từ tổng của bảng này.
        </p>
        <p className="measure-wide text-ink-2 mt-1.5 text-xs">
          Khoản thu chưa gắn với gói tập: studio chưa xác nhận danh mục gói và giá, nên nội
          dung khoản thu là phần nhân viên tự ghi.
        </p>
      </div>

      <LiveRegion message={notice} />

      <Dialog
        open={recording}
        onOpenChange={(next) => {
          if (!next) {
            record.reset();
            setRecording(false);
          }
        }}
      >
        <DialogContent
          title="Ghi nhận khoản thu"
          description="Số tiền studio đã nhận. Ghi sai thì hủy phiếu kèm lý do, không sửa lại phiếu cũ."
        >
          <PaymentForm
            students={roster.data ?? []}
            pending={record.isPending}
            error={record.error}
            onCancel={() => setRecording(false)}
            onSubmit={async (input) => {
              const created = await record.mutateAsync(input);
              setRecording(false);
              setNotice(`Đã ghi ${formatVnd(created.amount)} cho ${created.studentName}.`);
              return created;
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Confirm and void, on one row.
 *
 * Void asks for a reason in its own dialog because it reverses a money record;
 * confirm does not, because it changes nothing about what happened — it records
 * that someone checked. Both are absent on a row that is already settled, rather
 * than present and disabled: a disabled control invites a second click.
 */
function RowActions({ payment }: { payment: Payment }) {
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const mutate = useSetPaymentStatus(payment.id);
  const tooShort = reason.trim().length < 6;

  if (payment.status === "void") {
    return payment.voidReason ? (
      <span className="text-ink-2 block max-w-[16rem] text-xs">{payment.voidReason}</span>
    ) : null;
  }

  return (
    <span className="flex flex-col items-start gap-1 lg:gap-0.5">
      {payment.status === "pending" ? (
        <button
          type="button"
          disabled={mutate.isPending}
          onClick={() => mutate.mutate({ status: "confirmed" })}
          className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-xs underline underline-offset-[6px] disabled:opacity-60"
        >
          Xác nhận
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setVoiding(true)}
        className="text-ink-2 decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-xs underline underline-offset-[6px]"
      >
        Hủy phiếu
      </button>

      <Dialog
        open={voiding}
        onOpenChange={(next) => {
          if (!next) {
            mutate.reset();
            setVoiding(false);
          }
        }}
      >
        <DialogContent
          title="Hủy phiếu thu"
          description={`${formatVnd(payment.amount)} của ${payment.studentName}. Phiếu vẫn nằm trong sổ, được đánh dấu đã hủy kèm lý do — số tiền này sẽ không còn vào doanh thu.`}
        >
          <div className="flex flex-col gap-4">
            <Field label="Lý do hủy" required>
              {({ id }) => (
                <Textarea
                  id={id}
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              )}
            </Field>

            {mutate.error ? (
              <p role="alert" className="text-danger text-sm">
                Chưa hủy được phiếu. Vui lòng thử lại sau ít phút.
              </p>
            ) : null}

            <FormActions>
              <Button variant="secondary" size="sm" onClick={() => setVoiding(false)}>
                Không hủy
              </Button>
              <Button
                size="sm"
                pending={mutate.isPending}
                disabled={tooShort}
                onClick={() => {
                  mutate.mutate(
                    { status: "void", voidReason: reason.trim() },
                    { onSuccess: () => setVoiding(false) },
                  );
                }}
              >
                Hủy phiếu này
              </Button>
            </FormActions>
          </div>
        </DialogContent>
      </Dialog>
    </span>
  );
}

/**
 * 1440 / 1024: seven columns of audit trail. The amount is the only right-aligned
 * column, so the eye compares money down one edge and nothing else competes.
 */
function PaymentTable({ payments }: { payments: Payment[] }) {
  return (
    <DataTable caption="Các khoản thanh toán đã ghi nhận, mới nhất trước" minWidth="64rem">
      <thead>
        <tr>
          <Th>Ngày</Th>
          <Th>Học viên</Th>
          <Th>Nội dung</Th>
          <Th>Phương thức</Th>
          <Th numeric>Số tiền</Th>
          <Th>Trạng thái</Th>
          <Th>Ghi nhận bởi</Th>
        </tr>
      </thead>
      <tbody>
        {payments.map((payment) => (
          <Tr key={payment.id}>
            <Td className="align-top whitespace-nowrap">
              <Figures>{formatDate(payment.recordedAt)}</Figures>
              <Figures className="text-ink-2 mt-0.5 block text-xs">
                {formatTime(payment.recordedAt)}
              </Figures>
            </Td>
            <Td className="align-top">
              {/* The student's name wraps; a Vietnamese name is never truncated. */}
              <Link
                to={`/studio/hoc-vien/${payment.studentId}`}
                className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[6px]"
              >
                {payment.studentName}
              </Link>
            </Td>
            <Td className="align-top">
              <span className="block max-w-[22rem]">{payment.reference}</span>
            </Td>
            <Td className="text-ink-2 align-top">{METHOD[payment.method]}</Td>
            <Td numeric className="align-top">
              <Figures className="whitespace-nowrap">{formatVnd(payment.amount)}</Figures>
            </Td>
            {/* The action lives on the status it changes, rather than in a
                column of its own that pushed the table past its space. */}
            <Td className="align-top">
              <StatusBadge tone={STATUS[payment.status].tone}>
                {STATUS[payment.status].label}
              </StatusBadge>
              <span className="mt-1.5 block">
                <RowActions payment={payment} />
              </span>
            </Td>
            <Td className="text-ink-2 align-top">{payment.recordedBy}</Td>
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}

/**
 * Below lg the table becomes ruled rows. "Ghi nhận bởi" stays: a payment record
 * without the person who recorded it is not a record.
 */
function PaymentList({ payments }: { payments: Payment[] }) {
  return (
    <ul className="rule-t">
      {payments.map((payment) => (
        <li key={payment.id} className="rule-b py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
            <Link
              to={`/studio/hoc-vien/${payment.studentId}`}
              className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-sm underline underline-offset-[6px]"
            >
              {payment.studentName}
            </Link>
            <StatusBadge tone={STATUS[payment.status].tone}>
              {STATUS[payment.status].label}
            </StatusBadge>
          </div>

          <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <Figures className="text-ink text-lg">{formatVnd(payment.amount)}</Figures>
            <span className="text-ink-2 text-xs">{METHOD[payment.method]}</span>
          </p>

          <p className="text-ink mt-1 text-sm">{payment.reference}</p>

          <p className="text-ink-2 mt-1.5 text-xs">
            <Figures className="text-ink">{formatDate(payment.recordedAt)}</Figures>{" "}
            <Figures className="text-ink">{formatTime(payment.recordedAt)}</Figures>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            Ghi nhận bởi {payment.recordedBy}
          </p>

          <p className="mt-2">
            <RowActions payment={payment} />
          </p>
        </li>
      ))}
    </ul>
  );
}

/** A figure that is not known yet. The dash is decoration, so it is announced. */
function Placeholder() {
  return (
    <>
      <span aria-hidden="true" className="text-ink-2">
        —
      </span>
      <span className="sr-only">đang tải</span>
    </>
  );
}
