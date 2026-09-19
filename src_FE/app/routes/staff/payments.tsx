import { useState } from "react";
import { Link } from "react-router";

import { PaymentForm } from "~/features/commerce/payment-form";
import {
  useConfirmPayment,
  usePayments,
  useRecordPayment,
  useStudentPackages,
  useVoidPayment,
} from "~/features/commerce/queries";
import { useStudents } from "~/features/people/queries";
import { errorMessage } from "~/lib/api/client";
import type { PaymentMethod, PaymentResponse, PaymentStatus } from "~/lib/api/schema";
import { decimalToNumber, formatDate, formatTime, formatVnd } from "~/lib/format";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { Dialog, DialogContent } from "~/ui/dialog";
import { LiveRegion } from "~/ui/feedback";
import { Field, FormActions, Select, Textarea } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { FilterBar, PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";

import type { Route } from "./+types/payments";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Thanh toán — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The payments log.
 *
 * The winning subject is the transaction (P1): the amount is the only figure
 * compared down the page, and the package, the note and the method are its
 * attributes.
 *
 * Two facts shape this screen and both come from the contract:
 *
 *  - **A payment belongs to a package, not to a person.** `student_package_id`
 *    is required, and the credits were added when the package was sold — this
 *    record only says the money arrived.
 *  - **`GET /payments` filters by student, package and status, not by date.**
 *    So there is no date range here. Money over a period is the revenue report,
 *    which the backend computes from `confirmed_at`; a second total assembled
 *    from whatever rows this page happened to fetch would be a rival answer.
 *
 * Recording is on this screen, and so is the only correction path: a wrong
 * record is voided with a stated reason, never edited into looking right.
 */

const STATUS: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  CONFIRMED: { label: "Đã xác nhận", tone: "positive" },
  PENDING: { label: "Chờ xác nhận", tone: "attention" },
  // A voided record is not a failure, it is a corrected entry. Neutral, not danger.
  VOID: { label: "Đã hủy", tone: "neutral" },
};

const STATUS_ORDER: PaymentStatus[] = ["CONFIRMED", "PENDING", "VOID"];

/** The method is written in words: a cash icon says nothing a word does not. */
const METHOD: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  TRANSFER: "Chuyển khoản",
};

export default function StaffPayments() {
  const [status, setStatus] = useState<PaymentStatus | "all">("all");
  const [studentId, setStudentId] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const record = useRecordPayment();
  // The roster for the filter and the picker, fetched up front so the dialog
  // opens with its options already there. It is a small, long-cached list.
  const roster = useStudents({ limit: 200 });

  const query = usePayments({
    status: status === "all" ? undefined : status,
    student_id: studentId ?? undefined,
    limit: 200,
  });
  const items = query.data;

  // Package names, when a student is selected. Without one there is nothing to
  // resolve `student_package_id` against, and the row shows the id instead of
  // borrowing a name from somewhere it does not belong.
  const packages = useStudentPackages(
    { student_id: studentId ?? undefined },
    { enabled: studentId !== null },
  );
  const packageNames = new Map(
    (studentId === null ? [] : (packages.data ?? [])).map((item) => [
      item.id,
      item.name_snapshot,
    ]),
  );

  // The confirmed subset, and nothing else, is what the header reports.
  const confirmed = (items ?? []).filter((item) => item.status === "CONFIRMED");
  const confirmedTotal = confirmed.reduce(
    (sum, item) => sum + (decimalToNumber(item.amount) ?? 0),
    0,
  );

  const narrowed = status !== "all" || studentId !== null;

  return (
    <div className="gutter py-6">
      <PageHeader
        title="Thanh toán"
        description="Các khoản thu đã ghi nhận. Tổng tiền chỉ cộng những giao dịch đã xác nhận đang hiển thị."
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
        <Field label="Học viên" className="w-full sm:w-64">
          {({ id }) => (
            <Select
              id={id}
              value={studentId === null ? "" : String(studentId)}
              onChange={(event) =>
                setStudentId(event.target.value === "" ? null : Number(event.target.value))
              }
            >
              <option value="">Tất cả học viên</option>
              {(roster.data ?? []).map((student) => (
                <option key={student.id} value={String(student.id)}>
                  {student.full_name}
                </option>
              ))}
            </Select>
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

      <QueryBoundary
        query={query}
        skeletonRows={8}
        showErrorDetail
        errorDescription="Không tải được danh sách thanh toán."
        emptyTitle={
          narrowed ? "Không có giao dịch nào khớp bộ lọc" : "Chưa có giao dịch nào"
        }
        emptyDescription={
          narrowed
            ? "Bộ lọc đang thu hẹp kết quả. Bỏ lọc để xem toàn bộ."
            : "Các khoản thu do nhân viên ghi nhận sẽ xuất hiện ở đây, mới nhất trước."
        }
        emptyAction={
          narrowed ? (
            <Button
              variant="secondary"
              onClick={() => {
                setStatus("all");
                setStudentId(null);
              }}
            >
              Bỏ bộ lọc
            </Button>
          ) : undefined
        }
      >
        {(payments) => {
          // Newest first: a payments log is read from the most recent receipt.
          const sorted = [...payments].sort(
            (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
          );

          return (
            <>
              <div className="hidden lg:block">
                <PaymentTable payments={sorted} packageNames={packageNames} />
              </div>
              <div className="lg:hidden">
                <PaymentList payments={sorted} packageNames={packageNames} />
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
          Buổi tập đã được cộng vào gói từ lúc bán gói, không đợi bước ghi nhận tiền này.
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
          description="Số tiền studio đã nhận, gắn với gói học viên đã mua. Ghi sai thì hủy phiếu kèm lý do, không sửa lại phiếu cũ."
        >
          <PaymentForm
            students={roster.data ?? []}
            pending={record.isPending}
            error={record.error}
            onCancel={() => setRecording(false)}
            onSubmit={async (input) => {
              const created = await record.mutateAsync(input);
              setRecording(false);
              setNotice(`Đã ghi ${formatVnd(created.amount)}, đang chờ xác nhận.`);
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
function RowActions({ payment }: { payment: PaymentResponse }) {
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const confirm = useConfirmPayment();
  const voidPayment = useVoidPayment();
  const tooShort = reason.trim().length < 6;

  if (payment.status === "VOID") {
    return payment.void_reason ? (
      <span className="text-ink-2 block max-w-[16rem] text-xs">{payment.void_reason}</span>
    ) : null;
  }

  return (
    <span className="flex flex-col items-start gap-1 lg:gap-0.5">
      {payment.status === "PENDING" ? (
        <button
          type="button"
          disabled={confirm.isPending}
          onClick={() => confirm.mutate(payment.id)}
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
            voidPayment.reset();
            setVoiding(false);
          }
        }}
      >
        <DialogContent
          title="Hủy phiếu thu"
          description={`${formatVnd(payment.amount)}. Phiếu vẫn nằm trong sổ, được đánh dấu đã hủy kèm lý do — số tiền này sẽ không còn vào doanh thu.`}
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

            {voidPayment.error ? (
              <p role="alert" className="text-danger text-sm">
                {/* The usual refusal is a package that has already spent
                    credits; the backend names how many, in words. */}
                {errorMessage(voidPayment.error, "Chưa hủy được phiếu.")}
              </p>
            ) : null}

            <FormActions>
              <Button variant="secondary" size="sm" onClick={() => setVoiding(false)}>
                Không hủy
              </Button>
              <Button
                size="sm"
                pending={voidPayment.isPending}
                disabled={tooShort}
                onClick={() => {
                  voidPayment.mutate(
                    { paymentId: payment.id, reason: reason.trim() },
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

interface RowsProps {
  payments: PaymentResponse[];
  packageNames: Map<number, string>;
}

/**
 * 1440 / 1024: the audit trail. The amount is the only right-aligned column, so
 * the eye compares money down one edge and nothing else competes.
 */
function PaymentTable({ payments, packageNames }: RowsProps) {
  return (
    <DataTable caption="Các khoản thanh toán đã ghi nhận, mới nhất trước" minWidth="60rem">
      <thead>
        <tr>
          <Th>Ngày ghi</Th>
          <Th>Gói tập</Th>
          <Th>Ghi chú</Th>
          <Th>Phương thức</Th>
          <Th numeric>Số tiền</Th>
          <Th>Trạng thái</Th>
        </tr>
      </thead>
      <tbody>
        {payments.map((payment) => (
          <Tr key={payment.id}>
            <Td className="align-top whitespace-nowrap">
              <Figures>{formatDate(payment.recorded_at)}</Figures>
              <Figures className="text-ink-2 mt-0.5 block text-xs">
                {formatTime(payment.recorded_at)}
              </Figures>
            </Td>
            <Td className="align-top">
              {packageNames.get(payment.student_package_id) ??
                `Gói #${payment.student_package_id}`}
            </Td>
            <Td className="align-top">
              <span className="block max-w-[22rem]">{payment.note ?? ""}</span>
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
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}

/** Below lg the table becomes ruled rows: a studio phone gets the same facts. */
function PaymentList({ payments, packageNames }: RowsProps) {
  return (
    <ul className="rule-t">
      {payments.map((payment) => (
        <li key={payment.id} className="rule-b py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
            <span className="text-ink text-sm">
              {packageNames.get(payment.student_package_id) ??
                `Gói #${payment.student_package_id}`}
            </span>
            <StatusBadge tone={STATUS[payment.status].tone}>
              {STATUS[payment.status].label}
            </StatusBadge>
          </div>

          <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <Figures className="text-ink text-lg">{formatVnd(payment.amount)}</Figures>
            <span className="text-ink-2 text-xs">{METHOD[payment.method]}</span>
          </p>

          {payment.note ? <p className="text-ink mt-1 text-sm">{payment.note}</p> : null}

          <p className="text-ink-2 mt-1.5 text-xs">
            <Figures className="text-ink">{formatDate(payment.recorded_at)}</Figures>{" "}
            <Figures className="text-ink">{formatTime(payment.recorded_at)}</Figures>
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
