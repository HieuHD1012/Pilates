import { useState } from "react";
import { Link, useParams } from "react-router";

import { PaymentForm } from "~/features/commerce/payment-form";
import { useRecordPayment } from "~/features/commerce/queries";
import { useStudentDetail, useUpdateStudent } from "~/features/people/queries";
import { StudentForm } from "~/features/people/student-form";
import type {
  BookingHistoryEntry,
  BookingStatus,
  ClassType,
  Payment,
  PaymentMethod,
  PaymentStatus,
  StudentDetail,
  StudentPackage,
  StudentPackageStatus,
  StudentStatus,
} from "~/lib/api/types";
import {
  formatDate,
  formatPhone,
  formatTime,
  formatVnd,
  telHref,
  weekdayShort,
} from "~/lib/format";
import { Button } from "~/ui/button";
import { DataTable, Td, Th } from "~/ui/data-table";
import { Dialog, DialogContent } from "~/ui/dialog";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { DetailList, DetailRow } from "~/ui/detail-list";
import { EmptyState, LiveRegion, Skeleton, SkeletonRows } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { Absent } from "~/ui/absent";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";
import { Tab, TabList, TabPanel, Tabs } from "~/ui/tabs";

import type { Route } from "./+types/student-detail";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Chi tiết học viên — Soul Pilates" },
    { name: "robots", content: "noindex" },
  ];
}

const STUDENT_STATUS: Record<StudentStatus, { label: string; tone: StatusTone }> = {
  active: { label: "Đang học", tone: "positive" },
  expiring: { label: "Sắp hết hạn", tone: "attention" },
  expired: { label: "Hết hạn", tone: "critical" },
  inactive: { label: "Tạm nghỉ", tone: "neutral" },
};

const PACKAGE_STATUS: Record<StudentPackageStatus, { label: string; tone: StatusTone }> = {
  active: { label: "Đang dùng", tone: "positive" },
  expired: { label: "Hết hạn", tone: "critical" },
  used_up: { label: "Hết buổi", tone: "critical" },
  suspended: { label: "Tạm dừng", tone: "attention" },
};

const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "Chờ xác nhận", tone: "attention" },
  confirmed: { label: "Đã xác nhận", tone: "positive" },
  void: { label: "Đã huỷ", tone: "neutral" },
};

const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
};

const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: StatusTone }> = {
  booked: { label: "Đã đặt", tone: "info" },
  waitlisted: { label: "Chờ chỗ", tone: "attention" },
  attended: { label: "Đã tập", tone: "positive" },
  cancelled: { label: "Đã huỷ", tone: "neutral" },
  no_show: { label: "Không đến", tone: "critical" },
};

const CLASS_TYPE: Record<ClassType, string> = {
  group: "Lớp nhóm",
  private: "Lớp riêng",
};

/**
 * One student.
 *
 * The information architecture is the three questions staff actually arrive
 * with, which is why it is three tabs rather than one long scroll: who is this
 * person, what have they paid for and what is left, and what have they used.
 * Editing is deliberately absent — no endpoint exists, and a disabled form is a
 * worse answer than no form (docs/OPEN_QUESTIONS.md).
 */
export default function StaffStudentDetail() {
  const [editing, setEditing] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const { studentId = "" } = useParams();
  const query = useStudentDetail(studentId);

  return (
    <div className="gutter py-6">
      <Link
        to="/studio/hoc-vien"
        className="text-ink-2 decoration-rule-2 hover:text-ink text-xs underline underline-offset-[6px]"
      >
        Danh sách học viên
      </Link>

      <QueryBoundary
        query={query}
        loading={
          <div className="mt-4">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="mt-3 h-3 w-48" />
            <SkeletonRows rows={6} className="mt-6" />
          </div>
        }
        errorDescription="Không tải được thông tin học viên. Học viên có thể đã được gộp hoặc đường dẫn không còn đúng."
        showErrorDetail
      >
        {(student) => (
          <>
            <PageHeader
              className="mt-4"
              title={student.fullName}
              description="Gói tập, thanh toán và lịch sử lớp của học viên này."
              actions={
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  Sửa hồ sơ
                </Button>
              }
              meta={
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <dl className="text-ink-2 flex items-baseline gap-2 text-xs">
                    <dt>Điện thoại</dt>
                    <dd>
                      <a
                        href={telHref(student.phone)}
                        className="figures text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[6px]"
                      >
                        {formatPhone(student.phone)}
                      </a>
                    </dd>
                  </dl>
                  <StatusBadge tone={STUDENT_STATUS[student.status].tone}>
                    {STUDENT_STATUS[student.status].label}
                  </StatusBadge>
                </div>
              }
            />

            <DemoDataNotice className="mt-3" />

            <Tabs defaultValue="tong-quan" className="mt-5">
              <TabList label="Thông tin học viên">
                <Tab value="tong-quan">Tổng quan</Tab>
                <Tab value="goi-thanh-toan">Gói &amp; thanh toán</Tab>
                <Tab value="lich-su">Lịch sử lớp</Tab>
              </TabList>

              <TabPanel value="tong-quan">
                <DetailList className="max-w-(--container-column)">
                  {/* Điện thoại và trạng thái nằm ở dải đầu trang, hiển thị ở cả ba tab —
                      nên không nhắc lại ở đây. */}
                  <DetailRow label="Email">
                    {student.email ?? <Absent>Chưa ghi</Absent>}
                  </DetailRow>
                  <DetailRow label="Ngày tham gia">
                    <Figures>{formatDate(`${student.joinedAt}T00:00:00+07:00`)}</Figures>
                  </DetailRow>
                  <DetailRow label="Gói hiện tại">
                    {student.currentPackageName ?? <Absent>Chưa có gói</Absent>}
                  </DetailRow>
                  <DetailRow label="Số buổi còn lại">
                    {student.sessionsRemaining === null ? (
                      <Placeholder />
                    ) : (
                      <>
                        <Figures>{student.sessionsRemaining}</Figures> buổi
                      </>
                    )}
                  </DetailRow>
                  <DetailRow label="Hạn dùng">
                    {student.expiryDate === null ? (
                      <Placeholder />
                    ) : (
                      <Figures>
                        {formatDate(`${student.expiryDate}T00:00:00+07:00`)}
                      </Figures>
                    )}
                  </DetailRow>
                  {student.renewalDue ? (
                    <DetailRow label="Gia hạn">
                      <StatusBadge tone="attention">Cần gia hạn</StatusBadge>
                    </DetailRow>
                  ) : null}
                  {student.note ? (
                    <DetailRow label="Ghi chú">{student.note}</DetailRow>
                  ) : null}
                </DetailList>
              </TabPanel>

              <TabPanel value="goi-thanh-toan">
                <section>
                  <h2 className="text-ink text-sm font-medium">Gói tập</h2>
                  {student.packages.length === 0 ? (
                    <EmptyState
                      className="mt-3"
                      title="Chưa có gói tập nào"
                      description="Học viên này chưa được ghi nhận gói nào trong hệ thống của studio."
                    />
                  ) : (
                    <ul className="rule-t mt-3">
                      {student.packages.map((item) => (
                        <li key={item.id} className="rule-b py-4">
                          <PackageRow item={item} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="mt-10">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 className="text-ink text-sm font-medium">Thanh toán</h2>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setRecordingPayment(true)}
                    >
                      Ghi nhận khoản thu
                    </Button>
                  </div>
                  {student.payments.length === 0 ? (
                    <EmptyState
                      className="mt-3"
                      title="Chưa có khoản thanh toán nào"
                      description="Các khoản thu do nhân viên ghi nhận sẽ xuất hiện ở đây."
                    />
                  ) : (
                    <PaymentsTable payments={student.payments} />
                  )}
                </section>

                <p className="measure-wide text-ink-2 mt-6 text-xs">
                  Số buổi còn lại luôn bằng tổng cộng và trừ trong sổ buổi của gói. Mọi điều
                  chỉnh buổi được ghi ở đó, kèm lý do và người thực hiện — mở sổ từ chính
                  gói phía trên.
                </p>
              </TabPanel>

              <TabPanel value="lich-su">
                {student.classHistory.length === 0 ? (
                  <EmptyState
                    title="Chưa có lịch sử lớp"
                    description="Học viên chưa tham gia buổi nào, hoặc chưa có buổi nào được ghi nhận."
                  />
                ) : (
                  <ul className="rule-t">
                    {student.classHistory.map((entry) => (
                      <li key={entry.id} className="rule-b">
                        <HistoryRow entry={entry} />
                      </li>
                    ))}
                  </ul>
                )}
              </TabPanel>
            </Tabs>

            <LiveRegion message={saved} />

            <Dialog
              open={recordingPayment}
              onOpenChange={(next) => {
                if (!next) setRecordingPayment(false);
              }}
            >
              <DialogContent
                title="Ghi nhận khoản thu"
                description="Số tiền studio đã nhận từ học viên này. Ghi sai thì hủy phiếu kèm lý do ở màn hình thanh toán."
              >
                <StudentPaymentForm
                  student={student}
                  onDone={(message) => {
                    setRecordingPayment(false);
                    setSaved(message);
                  }}
                  onCancel={() => setRecordingPayment(false)}
                />
              </DialogContent>
            </Dialog>

            <Dialog
              open={editing}
              onOpenChange={(next) => {
                if (!next) setEditing(false);
              }}
            >
              <DialogContent
                title="Sửa hồ sơ học viên"
                description="Gói tập, thanh toán và số buổi không sửa ở đây — chúng có sổ ghi riêng."
              >
                <EditStudentForm
                  studentId={studentId}
                  student={student}
                  onDone={() => {
                    setEditing(false);
                    setSaved("Đã lưu hồ sơ học viên.");
                  }}
                  onCancel={() => setEditing(false)}
                />
              </DialogContent>
            </Dialog>
          </>
        )}
      </QueryBoundary>
    </div>
  );
}

function PackageRow({ item }: { item: StudentPackage }) {
  const status = PACKAGE_STATUS[item.status];

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
      <div className="min-w-0">
        <p className="text-ink text-sm">{item.packageName}</p>
        <p className="text-ink-2 mt-1 text-xs">
          <Figures>{formatDate(`${item.startDate}T00:00:00+07:00`)}</Figures>
          <span className="mx-1">–</span>
          <Figures>{formatDate(`${item.expiryDate}T00:00:00+07:00`)}</Figures>
          <span className="mx-2">·</span>
          {item.allowedClassTypes.map((type) => CLASS_TYPE[type]).join(" · ")}
        </p>
      </div>

      <div className="flex items-baseline gap-5">
        <p className="text-ink-2 text-xs">
          Còn{" "}
          <Figures className="text-ink">
            {item.sessionsRemaining}/{item.sessionsTotal}
          </Figures>{" "}
          buổi
        </p>
        <Link
          to={`/studio/so-buoi?goi=${item.id}`}
          className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer text-xs underline underline-offset-[6px]"
        >
          Xem sổ buổi
        </Link>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>
    </div>
  );
}

/**
 * Payments keep their table shape at every width and scroll inside their own
 * container — five columns of money and audit trail do not survive being
 * folded into a phone-width list without losing the "recorded by" column,
 * which is the whole point of the record.
 */
function PaymentsTable({ payments }: { payments: Payment[] }) {
  return (
    <DataTable caption="Các khoản thanh toán đã ghi nhận" minWidth="44rem" className="mt-3">
      <thead>
        <tr>
          <Th>Ngày</Th>
          <Th numeric>Số tiền</Th>
          <Th>Phương thức</Th>
          <Th>Trạng thái</Th>
          <Th>Ghi nhận bởi</Th>
        </tr>
      </thead>
      <tbody>
        {payments.map((payment) => (
          <tr key={payment.id}>
            <Td>
              <Figures className="whitespace-nowrap">
                {formatDate(payment.recordedAt)}
              </Figures>
              {/* What the money bought, in the studio's own words. */}
              <span className="text-ink-2 mt-0.5 block text-xs">{payment.reference}</span>
            </Td>
            <Td numeric>
              <Figures className="whitespace-nowrap">{formatVnd(payment.amount)}</Figures>
            </Td>
            <Td>{PAYMENT_METHOD[payment.method]}</Td>
            <Td>
              <StatusBadge tone={PAYMENT_STATUS[payment.status].tone}>
                {PAYMENT_STATUS[payment.status].label}
              </StatusBadge>
            </Td>
            <Td>{payment.recordedBy}</Td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function HistoryRow({ entry }: { entry: BookingHistoryEntry }) {
  const status = BOOKING_STATUS[entry.status];

  return (
    <div className="grid gap-x-6 gap-y-1.5 py-3.5 sm:grid-cols-[13rem_1fr_auto] sm:items-baseline">
      <p className="flex items-baseline gap-2">
        <span className="text-ink-2 text-xs">{weekdayShort(entry.startsAt)}</span>
        <Figures className="text-ink text-xs">{formatDate(entry.startsAt)}</Figures>
        <Figures className="text-ink-2 text-xs">{formatTime(entry.startsAt)}</Figures>
      </p>

      <p className="min-w-0">
        <span className="text-ink text-sm">{entry.classTitle}</span>
        <span className="text-ink-2 mt-0.5 block text-xs">
          {CLASS_TYPE[entry.classType]} · {entry.trainerName}
        </span>
      </p>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:justify-end">
        <span className="text-ink-2 text-xs">
          Trừ <Figures className="text-ink">{entry.sessionsCharged}</Figures> buổi
        </span>
        {entry.refunded ? <span className="text-ink-2 text-xs">Đã hoàn buổi</span> : null}
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </p>
    </div>
  );
}

/**
 * An absent value. The dash is decoration, so it is hidden from assistive
 * technology and the meaning is written out instead — never the string "null".
 */
function Placeholder() {
  return (
    <>
      <span aria-hidden="true" className="text-ink-2">
        —
      </span>
      <span className="sr-only">chưa có</span>
    </>
  );
}

/**
 * Split out so the mutation hook receives a known student id. A hook cannot be
 * called conditionally, and this dialog only exists once the record resolved.
 */
function EditStudentForm({
  studentId,
  student,
  onDone,
  onCancel,
}: {
  studentId: string;
  student: StudentDetail;
  onDone: () => void;
  onCancel: () => void;
}) {
  const update = useUpdateStudent(studentId);

  return (
    <StudentForm
      defaultValues={{
        fullName: student.fullName,
        phone: student.phone,
        email: student.email ?? "",
        note: student.note ?? "",
      }}
      submitLabel="Lưu hồ sơ"
      pending={update.isPending}
      error={update.error}
      onCancel={onCancel}
      onSubmit={async (input) => {
        const result = await update.mutateAsync(input);
        onDone();
        return result;
      }}
    />
  );
}

/**
 * Recording from the profile: the student is already decided, so the form does not
 * ask again. Split out for the same reason the edit form is — a mutation hook
 * cannot be called conditionally, and this dialog only exists once the record
 * resolved.
 */
function StudentPaymentForm({
  student,
  onDone,
  onCancel,
}: {
  student: StudentDetail;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const record = useRecordPayment();

  return (
    <PaymentForm
      lockedStudent={{ id: student.id, fullName: student.fullName }}
      pending={record.isPending}
      error={record.error}
      onCancel={onCancel}
      onSubmit={async (input) => {
        const created = await record.mutateAsync(input);
        onDone(`Đã ghi ${formatVnd(created.amount)} cho ${created.studentName}.`);
        return created;
      }}
    />
  );
}
