import { Banknote, ChartColumn, Check, Info, Landmark, Plus, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

import { PaymentForm } from "~/features/commerce/payment-form";
import {
  useConfirmPayment,
  usePayments,
  usePayment,
  useRecordPayment,
  useStudentPackages,
  useVoidPayment,
} from "~/features/commerce/queries";
import { useStudentDirectory } from "~/features/people/queries";
import { errorMessage } from "~/lib/api/client";
import type {
  PaymentMethod,
  PaymentResponse,
  PaymentStatus,
  StudentResponse,
} from "~/lib/api/schema";
import { cn } from "~/lib/cn";
import {
  decimalToNumber,
  formatDate,
  formatNumber,
  formatPhone,
  formatTime,
  formatVnd,
} from "~/lib/format";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { Dialog, DialogContent } from "~/ui/dialog";
import { LiveRegion } from "~/ui/feedback";
import { Field, FormActions, Select, Textarea } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";
import {
  Avatar,
  InlineNote,
  Panel,
  PersonCell,
  RowMenu,
  RowMenuItem,
  SegmentFilter,
  Toolbar,
  WorkspacePage,
  type SegmentOption,
} from "~/ui/workspace";

import { PageControls } from "~/ui/page-controls";

import type { Route } from "./+types/payments";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Thanh toán — J Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The payments log.
 *
 * The winning subject is the transaction (P1): the amount is the only figure
 * compared down the page, and the package, the note and the method are its
 * attributes. Money that is waiting on someone — recorded, not yet confirmed —
 * is lifted out above the log, because it is the only part of this screen that
 * asks staff to do something.
 *
 * Two facts shape this screen and both come from the contract:
 *
 *  - **A payment belongs to a package, not to a person.** `student_package_id`
 *    is required, and the credits were added when the package was sold — this
 *    record only says the money arrived. `GET /payments` returns no student, so
 *    a row can name its person only when the list is filtered to one student.
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

/** Waiting work first: the segment staff most often need after "all". */
const STATUS_ORDER: PaymentStatus[] = ["PENDING", "CONFIRMED", "VOID"];

/** The method in words, with an icon that lets a column be scanned for it. */
const METHOD: Record<PaymentMethod, { label: string; icon: ReactNode }> = {
  CASH: { label: "Tiền mặt", icon: <Banknote className="size-4" aria-hidden="true" /> },
  TRANSFER: {
    label: "Chuyển khoản",
    icon: <Landmark className="size-4" aria-hidden="true" />,
  },
};

export default function StaffPayments() {
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<PaymentStatus | "all">("all");
  const [studentId, setStudentId] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const record = useRecordPayment();
  // The roster for the filter and the picker, fetched up front so the dialog
  // opens with its options already there. It is a small, long-cached list.
  const roster = useStudentDirectory();

  const query = usePayments({
    status: status === "all" ? undefined : status,
    student_id: studentId ?? undefined,
    limit: 200,
    offset,
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
  // The person every row belongs to, when the list is narrowed to one. A
  // payment carries no student of its own, so this is the only honest source.
  const student =
    studentId === null
      ? null
      : ((roster.data ?? []).find((entry) => entry.id === studentId) ?? null);

  // The confirmed subset, and nothing else, is what the footer totals.
  const confirmed = (items ?? []).filter((item) => item.status === "CONFIRMED");
  const confirmedTotal = confirmed.reduce(
    (sum, item) => sum + (decimalToNumber(item.amount) ?? 0),
    0,
  );

  // Waiting money is lifted above the log only while the log is unfiltered by
  // status: under "Chờ xác nhận" the log itself is that list, and repeating it
  // would put two confirm buttons on one payment.
  const pending = (items ?? []).filter((item) => item.status === "PENDING");
  const showAttention = status === "all" && pending.length > 0;

  // Counts are only known for what was fetched. Unfiltered, every segment can
  // be counted; filtered, only the one on screen can.
  const segments: SegmentOption<PaymentStatus | "all">[] = [
    { value: "all", label: "Tất cả", count: status === "all" ? items?.length : undefined },
    ...STATUS_ORDER.map((value) => ({
      value,
      label: STATUS[value].label,
      count:
        status === "all"
          ? items?.filter((item) => item.status === value).length
          : status === value
            ? items?.length
            : undefined,
    })),
  ];

  const narrowed = status !== "all" || studentId !== null;
  const rows: RowsProps = {
    payments: [],
    packageNames,
    student,
    confirmInline: !showAttention,
  };

  return (
    <WorkspacePage>
      <PageHeader
        title="Thanh toán"
        description="Số tiền studio đã nhận, gắn với gói học viên đã mua. Ghi sai thì hủy phiếu kèm lý do, không sửa phiếu cũ."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/studio/bao-cao/doanh-thu">
                <ChartColumn className="size-4" aria-hidden="true" />
                Báo cáo doanh thu
              </Link>
            </Button>
            <Button
              onClick={() => setRecording(true)}
              icon={<Plus className="size-4" aria-hidden="true" />}
            >
              Ghi nhận khoản thu
            </Button>
          </>
        }
      />

      {showAttention ? (
        <PendingPanel
          payments={sortNewestFirst(pending)}
          packageNames={packageNames}
          student={student}
          onConfirmed={setNotice}
        />
      ) : null}

      <Panel aria-label="Các khoản thanh toán">
        <Toolbar
          trailing={
            query.isFetching && !query.isPending ? (
              <span className="text-ink-2 text-xs">Đang cập nhật</span>
            ) : null
          }
        >
          <SegmentFilter
            label="Trạng thái"
            options={segments}
            value={status}
            onChange={(next) => {
              setOffset(0);
              setStatus(next);
            }}
          />
          <div className="w-full sm:w-60">
            <Select
              aria-label="Học viên"
              value={studentId === null ? "" : String(studentId)}
              onChange={(event) => {
                setOffset(0);
                setStudentId(event.target.value === "" ? null : Number(event.target.value));
              }}
            >
              <option value="">Tất cả học viên</option>
              {(roster.data ?? []).map((entry) => (
                <option key={entry.id} value={String(entry.id)}>
                  {entry.full_name}
                </option>
              ))}
            </Select>
          </div>
        </Toolbar>

        {/* The boundary's own states (skeleton, empty, error) need the panel's
            inset; the table and list cancel it to run edge to edge. */}
        <div className="px-4 md:px-5">
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
                    setOffset(0);
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
              const sorted = sortNewestFirst(payments);
              const total = (
                <TotalLine
                  shown={payments.length}
                  confirmedCount={confirmed.length}
                  confirmedTotal={confirmedTotal}
                />
              );

              return (
                <div className="-mx-4 md:-mx-5">
                  <div className="hidden lg:block">
                    <PaymentTable {...rows} payments={sorted} footer={total} />
                  </div>
                  <div className="lg:hidden">
                    <PaymentList {...rows} payments={sorted} />
                    <div className="rule-t px-4 py-3">{total}</div>
                  </div>
                </div>
              );
            }}
          </QueryBoundary>
        </div>
        <PageControls
          offset={offset}
          limit={200}
          count={items?.length ?? 0}
          pending={query.isFetching}
          onChange={setOffset}
        />
      </Panel>

      {/* One sentence, and only while it explains what is on screen: unfiltered,
          rows carry a package id and no person. What the total counts is said
          on the total line; that credits arrive at sale is said where money is
          confirmed. */}
      {studentId === null ? (
        <InlineNote icon={<Info aria-hidden="true" />}>
          Phiếu thu không kèm tên học viên: chọn một học viên để thấy tên người và tên gói
          trên từng dòng.
        </InlineNote>
      ) : null}

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
          busy={record.isPending}
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
    </WorkspacePage>
  );
}

function sortNewestFirst(payments: PaymentResponse[]): PaymentResponse[] {
  return [...payments].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
  );
}

function packageLabel(payment: PaymentResponse, packageNames: Map<number, string>) {
  return (
    packageNames.get(payment.student_package_id) ?? `Gói #${payment.student_package_id}`
  );
}

/** The student as a row's first cell: a link to their record, phone under it. */
function StudentCell({ student }: { student: StudentResponse }) {
  return (
    <PersonCell
      avatarName={student.full_name}
      name={
        <Link
          to={`/studio/hoc-vien/${student.id}`}
          className="decoration-rule-2 hover:decoration-copper underline-offset-[6px] hover:underline"
        >
          {student.full_name}
        </Link>
      }
      detail={formatPhone(student.phone)}
    />
  );
}

/* ── Waiting money ──────────────────────────────────────────────────────── */

/**
 * Recorded, not yet confirmed. Confirming is the money action on this screen,
 * so it is copper (ADR 0006, 9) and it lives here, at the top, rather than in
 * the log below. The attention ground already says "waiting": no icon tile,
 * and the items are hairline rows on it, not cards inside a card.
 */
function PendingPanel({
  payments,
  packageNames,
  student,
  onConfirmed,
}: {
  payments: PaymentResponse[];
  packageNames: Map<number, string>;
  student: StudentResponse | null;
  onConfirmed: (message: string) => void;
}) {
  return (
    <Panel tone="attention" aria-labelledby="pending-title">
      <div className="px-4 pt-3.5 md:px-5">
        <h2 id="pending-title" className="text-ink text-base font-semibold">
          <Figures>{formatNumber(payments.length)}</Figures> khoản thu đang chờ xác nhận
        </h2>
        {/* What confirming does, and what it does not: the credits were added
            when the package was sold. */}
        <p className="text-ink-2 mt-0.5 text-sm">
          Xác nhận khi tiền đã vào quỹ hoặc tài khoản studio; buổi tập đã cộng vào gói từ
          lúc bán.
        </p>
      </div>

      <ul className="divide-warning/30 mt-1.5 divide-y px-4 md:px-5">
        {payments.map((payment) => (
          <PendingItem
            key={payment.id}
            payment={payment}
            packageName={packageLabel(payment, packageNames)}
            student={student}
            onConfirmed={onConfirmed}
          />
        ))}
      </ul>
    </Panel>
  );
}

function PendingItem({
  payment,
  packageName,
  student,
  onConfirmed,
}: {
  payment: PaymentResponse;
  packageName: string;
  student: StudentResponse | null;
  onConfirmed: (message: string) => void;
}) {
  const confirm = useConfirmPayment();
  const facts = (
    <>
      {student ? `${packageName} · ` : null}
      {METHOD[payment.method].label.toLowerCase()} · ghi{" "}
      <Figures>{formatDate(payment.recorded_at)}</Figures> lúc{" "}
      <Figures>{formatTime(payment.recorded_at)}</Figures>
    </>
  );

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      {/* Written out rather than a PersonCell: the line under the name is
          long, and a Vietnamese line is wrapped, never truncated (AGENTS P5). */}
      <div className="flex min-w-0 flex-1 basis-60 items-start gap-3">
        {student ? <Avatar name={student.full_name} /> : null}
        <div className="min-w-0">
          <p className="text-ink text-sm font-medium">
            {student ? student.full_name : packageName}
          </p>
          <p className="text-ink-2 text-xs">
            {facts}
            {payment.note ? ` · ${payment.note}` : null}
          </p>
        </div>
      </div>

      <Figures display className="text-ink text-xl whitespace-nowrap">
        {formatVnd(payment.amount)}
      </Figures>

      <div className="flex flex-col items-start gap-1">
        <Button
          variant="copper"
          size="sm"
          className="max-sm:min-h-11"
          pending={confirm.isPending}
          icon={<Check className="size-4" aria-hidden="true" />}
          onClick={() =>
            confirm.mutate(payment.id, {
              onSuccess: () => onConfirmed(`Đã xác nhận ${formatVnd(payment.amount)}.`),
            })
          }
        >
          Xác nhận đã nhận tiền
        </Button>
        {confirm.isError ? (
          <p role="alert" className="text-danger text-xs">
            {errorMessage(confirm.error, "Chưa xác nhận được.")}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/* ── The log ────────────────────────────────────────────────────────────── */

interface RowsProps {
  payments: PaymentResponse[];
  packageNames: Map<number, string>;
  /** The one student the list is narrowed to, or null when it is not. */
  student: StudentResponse | null;
  /** Whether a pending row carries its own confirm button (see PendingPanel). */
  confirmInline: boolean;
}

/**
 * The actions a row offers. A row shows a button only when it needs handling
 * (ADR 0006, 7): confirming waiting money, when the panel above is not already
 * offering it. Voiding reverses a money record, so it sits in the overflow menu
 * and asks for a reason in its own dialog. A voided row has nothing left to do
 * and shows no controls at all — a disabled control invites a second click.
 */
function RowActions({
  payment,
  confirmInline,
}: {
  payment: PaymentResponse;
  confirmInline: boolean;
}) {
  const [voiding, setVoiding] = useState(false);
  const [viewing, setViewing] = useState(false);
  const detail = usePayment(viewing ? payment.id : null);
  const confirm = useConfirmPayment();

  return (
    <span className="flex items-center justify-end gap-1.5">
      {payment.status === "PENDING" && confirmInline ? (
        <Button
          variant="copper"
          size="sm"
          className="max-sm:min-h-11"
          pending={confirm.isPending}
          icon={<Check className="size-4" aria-hidden="true" />}
          onClick={() => confirm.mutate(payment.id)}
        >
          Xác nhận
        </Button>
      ) : null}

      <RowMenu label={`Thao tác cho phiếu ${formatVnd(payment.amount)}`}>
        <RowMenuItem onClick={() => setViewing(true)}>Xem phiếu</RowMenuItem>
        {payment.status !== "VOID" ? (
          <RowMenuItem
            danger
            icon={<X aria-hidden="true" />}
            note="Phiếu vẫn nằm trong sổ, kèm lý do hủy."
            onClick={() => setVoiding(true)}
          >
            Hủy phiếu
          </RowMenuItem>
        ) : null}
      </RowMenu>

      <VoidDialog payment={payment} open={voiding} onOpenChange={setVoiding} />
      <Dialog open={viewing} onOpenChange={setViewing}>
        <DialogContent title={`Phiếu thu #${payment.id}`}>
          <QueryBoundary query={detail} errorDescription="Chưa tải được phiếu thu.">
            {(row) => (
              <dl className="grid gap-4 text-sm">
                <div>
                  <dt className="text-ink-2">Số tiền</dt>
                  <dd>
                    {formatVnd(row.amount)} · {METHOD[row.method].label}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-2">Trạng thái</dt>
                  <dd>{STATUS[row.status].label}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">Gói tập</dt>
                  <dd>#{row.student_package_id}</dd>
                </div>
                <div>
                  <dt className="text-ink-2">Ghi nhận</dt>
                  <dd>
                    {formatDate(row.recorded_at)} · {formatTime(row.recorded_at)}
                  </dd>
                </div>
                {row.confirmed_at ? (
                  <div>
                    <dt className="text-ink-2">Xác nhận</dt>
                    <dd>
                      {formatDate(row.confirmed_at)} · {formatTime(row.confirmed_at)}
                    </dd>
                  </div>
                ) : null}
                {row.note ? (
                  <div>
                    <dt className="text-ink-2">Ghi chú</dt>
                    <dd>{row.note}</dd>
                  </div>
                ) : null}
                {row.void_reason ? (
                  <div>
                    <dt className="text-ink-2">Lý do hủy</dt>
                    <dd>{row.void_reason}</dd>
                  </div>
                ) : null}
              </dl>
            )}
          </QueryBoundary>
        </DialogContent>
      </Dialog>
    </span>
  );
}

function VoidDialog({
  payment,
  open,
  onOpenChange,
}: {
  payment: PaymentResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const voidPayment = useVoidPayment();
  const tooShort = reason.trim().length < 3;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          voidPayment.reset();
          onOpenChange(false);
        }
      }}
    >
      <DialogContent
        busy={voidPayment.isPending}
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
            <Button
              variant="secondary"
              size="sm"
              disabled={voidPayment.isPending}
              onClick={() => onOpenChange(false)}
            >
              Không hủy
            </Button>
            <Button
              size="sm"
              pending={voidPayment.isPending}
              disabled={tooShort}
              onClick={() => {
                voidPayment.mutate(
                  { paymentId: payment.id, reason: reason.trim() },
                  { onSuccess: () => onOpenChange(false) },
                );
              }}
            >
              Hủy phiếu này
            </Button>
          </FormActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusCell({ payment }: { payment: PaymentResponse }) {
  return (
    <>
      <StatusBadge tone={STATUS[payment.status].tone}>
        {STATUS[payment.status].label}
      </StatusBadge>
      {payment.status === "VOID" && payment.void_reason ? (
        <span className="text-ink-2 mt-1 block max-w-[16rem] text-xs">
          {payment.void_reason}
        </span>
      ) : null}
    </>
  );
}

function Amount({ payment, className }: { payment: PaymentResponse; className?: string }) {
  // A voided amount stays legible but struck: it was recorded, and it no
  // longer counts.
  return (
    <Figures
      className={cn(
        "whitespace-nowrap",
        payment.status === "VOID" ? "text-ink-2 line-through" : "text-ink",
        className,
      )}
    >
      {formatVnd(payment.amount)}
    </Figures>
  );
}

function MethodLabel({ method }: { method: PaymentMethod }) {
  return (
    <span className="text-ink [&>svg]:text-ink-2 inline-flex items-center gap-1.5 whitespace-nowrap">
      {METHOD[method].icon}
      {METHOD[method].label}
    </span>
  );
}

/** The figure the footer totals: confirmed money among the rows on screen. */
function TotalLine({
  shown,
  confirmedCount,
  confirmedTotal,
}: {
  shown: number;
  confirmedCount: number;
  confirmedTotal: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <span className="text-ink-2 text-sm">
        Tổng đã xác nhận trong danh sách đang hiển thị ·{" "}
        <Figures className="text-ink">{formatNumber(confirmedCount)}</Figures> trên{" "}
        <Figures className="text-ink">{formatNumber(shown)}</Figures> giao dịch
      </span>
      <Figures display className="text-ink text-2xl whitespace-nowrap">
        {formatVnd(confirmedTotal)}
      </Figures>
    </div>
  );
}

/**
 * 1024 and up: the audit trail. The amount is the only right-aligned column, so
 * the eye compares money down one edge and nothing else competes.
 */
function PaymentTable({
  payments,
  packageNames,
  student,
  confirmInline,
  footer,
}: RowsProps & { footer: ReactNode }) {
  return (
    <DataTable caption="Các khoản thanh toán đã ghi nhận, mới nhất trước" minWidth="60rem">
      <thead>
        <tr>
          {student ? <Th>Học viên</Th> : null}
          <Th>Gói tập</Th>
          <Th>Phương thức</Th>
          <Th>Ngày ghi</Th>
          <Th>Trạng thái</Th>
          <Th numeric>Số tiền</Th>
          <Th>
            <span className="sr-only">Thao tác</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {payments.map((payment) => (
          <Tr
            key={payment.id}
            className={cn(payment.status === "PENDING" && "bg-warning-wash/30")}
          >
            {student ? (
              <Td>
                <StudentCell student={student} />
              </Td>
            ) : null}
            <Td>
              <span className="block">{packageLabel(payment, packageNames)}</span>
              {payment.note ? (
                <span className="text-ink-2 mt-0.5 block max-w-[22rem] text-xs">
                  {payment.note}
                </span>
              ) : null}
            </Td>
            <Td>
              <MethodLabel method={payment.method} />
            </Td>
            <Td className="whitespace-nowrap">
              <Figures>{formatDate(payment.recorded_at)}</Figures>
              <Figures className="text-ink-2 mt-0.5 block text-xs">
                {formatTime(payment.recorded_at)}
              </Figures>
            </Td>
            <Td>
              <StatusCell payment={payment} />
            </Td>
            <Td numeric>
              <Amount payment={payment} className="text-lg" />
            </Td>
            <Td className="w-px">
              <RowActions payment={payment} confirmInline={confirmInline} />
            </Td>
          </Tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={student ? 7 : 6} className="rule-t px-4 py-3.5">
            {footer}
          </td>
        </tr>
      </tfoot>
    </DataTable>
  );
}

/** Below 1024 the table becomes rows: a studio phone gets the same facts. */
function PaymentList({ payments, packageNames, student, confirmInline }: RowsProps) {
  return (
    <ul className="divide-rule divide-y">
      {payments.map((payment) => (
        <li
          key={payment.id}
          className={cn(
            "flex flex-col gap-2 px-4 py-4",
            payment.status === "PENDING" && "bg-warning-wash/30",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {student ? <StudentCell student={student} /> : null}
              <p className={cn("text-ink text-sm", student && "mt-2")}>
                {packageLabel(payment, packageNames)}
              </p>
            </div>
            <StatusCell payment={payment} />
          </div>

          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Amount payment={payment} className="text-xl" />
            <span className="text-sm">
              <MethodLabel method={payment.method} />
            </span>
          </p>

          {payment.note ? <p className="text-ink text-sm">{payment.note}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-ink-2 text-xs">
              Ghi <Figures className="text-ink">{formatDate(payment.recorded_at)}</Figures>{" "}
              <Figures className="text-ink">{formatTime(payment.recorded_at)}</Figures>
            </p>
            <RowActions payment={payment} confirmInline={confirmInline} />
          </div>
        </li>
      ))}
    </ul>
  );
}
