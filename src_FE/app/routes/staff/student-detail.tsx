import { useState } from "react";
import { Link, useParams } from "react-router";

import { useSession } from "~/features/auth/use-session";
import { PaymentForm } from "~/features/commerce/payment-form";
import {
  usePackageTypes,
  usePayments,
  useRecordPayment,
  useRenewalHistory,
  useRenewPackage,
  useSellPackage,
  useStudentPackages,
} from "~/features/commerce/queries";
import { useMySchedule } from "~/features/booking/queries";
import {
  useProgressPhotos,
  useStudent,
  useStudentOverview,
  useUpdateStudent,
} from "~/features/people/queries";
import { StudentForm } from "~/features/people/student-form";
import { errorMessage } from "~/lib/api/client";
import type {
  BookingStatus,
  ClassType,
  MyScheduleItem,
  PaymentMethod,
  PaymentResponse,
  PaymentStatus,
  StudentPackageResponse,
  StudentPackageStatus,
  StudentResponse,
  StudentStatus,
} from "~/lib/api/schema";
import {
  formatDate,
  formatPhone,
  formatTime,
  formatVnd,
  studioDateKey,
  telHref,
  weekdayShort,
} from "~/lib/format";
import { Absent } from "~/ui/absent";
import { Button } from "~/ui/button";
import { DataTable, Td, Th } from "~/ui/data-table";
import { Dialog, DialogContent } from "~/ui/dialog";
import { DetailList, DetailRow } from "~/ui/detail-list";
import { EmptyState, LiveRegion, Skeleton, SkeletonRows } from "~/ui/feedback";
import { Field, FormActions, Input, Select } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
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
  ACTIVE: { label: "Đang học", tone: "positive" },
  INACTIVE: { label: "Tạm nghỉ", tone: "neutral" },
};

const PACKAGE_STATUS: Record<StudentPackageStatus, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: "Đang dùng", tone: "positive" },
  EXPIRED: { label: "Hết hạn", tone: "critical" },
  CANCELLED: { label: "Đã hủy", tone: "neutral" },
};

const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: "Chờ xác nhận", tone: "attention" },
  CONFIRMED: { label: "Đã xác nhận", tone: "positive" },
  VOID: { label: "Đã huỷ", tone: "neutral" },
};

const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  TRANSFER: "Chuyển khoản",
};

const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: StatusTone }> = {
  BOOKED: { label: "Đã đặt", tone: "info" },
  ATTENDED: { label: "Đã đến lớp", tone: "positive" },
  NO_SHOW: { label: "Vắng mặt", tone: "critical" },
  CANCELLED_INTIME: { label: "Đã huỷ", tone: "neutral" },
  CANCELLED_LATE: { label: "Hủy muộn", tone: "neutral" },
};

const CLASS_TYPE: Record<ClassType, string> = {
  GROUP: "Lớp nhóm",
  PRIVATE: "Lớp riêng",
};

/**
 * One student, assembled from the endpoints that each own a piece of them.
 *
 * There is no single "student detail" response, and that is the right shape:
 * `/students/{id}` is the profile, `/students/{id}/overview` is credits and
 * active packages, `/packages` is what they bought, `/payments` is what they
 * paid, `/my-schedule` is what they attended. Five tabs' worth of questions,
 * five queries, each fetched by the tab that asks it.
 *
 * The progress-photos tab is **absent for STAFF**, not disabled: showing it and
 * catching the 403 tells a receptionist that photographs of this person exist.
 */
export default function StaffStudentDetail() {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const { studentId = "" } = useParams();
  const id = Number(studentId);
  const query = useStudent(id);
  const session = useSession();

  // ADMIN, the student themselves and their trainer may look. STAFF may not.
  const maySeePhotos = session.data?.role === "ADMIN";

  return (
    <div className="gutter py-6">
      <LiveRegion message={saved} />

      <Link
        to="/studio/hoc-vien"
        className="text-ink-2 decoration-rule-2 hover:text-ink text-xs underline underline-offset-[6px]"
      >
        Danh sách học viên
      </Link>

      <QueryBoundary
        query={query}
        isEmpty={() => false}
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
              title={student.full_name}
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

            <Tabs defaultValue="tong-quan" className="mt-5">
              <TabList label="Thông tin học viên">
                <Tab value="tong-quan">Tổng quan</Tab>
                <Tab value="goi-thanh-toan">Gói &amp; thanh toán</Tab>
                <Tab value="lich-su">Lịch sử lớp</Tab>
                {maySeePhotos ? <Tab value="anh">Ảnh tiến trình</Tab> : null}
              </TabList>

              <TabPanel value="tong-quan">
                <OverviewTab student={student} />
              </TabPanel>

              <TabPanel value="goi-thanh-toan">
                <CommerceTab student={student} onSaved={setSaved} />
              </TabPanel>

              <TabPanel value="lich-su">
                <HistoryTab studentId={student.id} />
              </TabPanel>

              {maySeePhotos ? (
                <TabPanel value="anh">
                  <PhotosTab studentId={student.id} />
                </TabPanel>
              ) : null}
            </Tabs>

            <Dialog
              open={editing}
              onOpenChange={(next) => {
                if (!next) setEditing(false);
              }}
            >
              <DialogContent
                title="Sửa hồ sơ học viên"
                description="Số điện thoại là khóa nhận diện của studio, nên mỗi số chỉ thuộc về một hồ sơ."
              >
                <EditStudentForm
                  student={student}
                  onCancel={() => setEditing(false)}
                  onSaved={(name) => {
                    setEditing(false);
                    setSaved(`Đã lưu hồ sơ của ${name}.`);
                  }}
                />
              </DialogContent>
            </Dialog>
          </>
        )}
      </QueryBoundary>
    </div>
  );
}

/** Credits and active packages, counted from the ledger by the backend. */
function OverviewTab({ student }: { student: StudentResponse }) {
  const overview = useStudentOverview(student.id);
  const contacts = useRenewalHistory(student.id);

  return (
    <>
      <DetailList className="max-w-(--container-column)">
        {/* Phone and status sit in the header strip, shown on every tab — so
            they are not repeated here. */}
        <DetailRow label="Email">{student.email ?? <Absent>Chưa ghi</Absent>}</DetailRow>
        <DetailRow label="Ngày sinh">
          {student.dob ? (
            <Figures>{formatDate(`${student.dob}T00:00:00+07:00`)}</Figures>
          ) : (
            <Absent>Chưa ghi</Absent>
          )}
        </DetailRow>
        <DetailRow label="Vào studio">
          <Figures>{formatDate(student.created_at)}</Figures>
        </DetailRow>
        <DetailRow label="Tài khoản đăng nhập">
          {student.user_id !== null ? (
            "Đã có tài khoản"
          ) : (
            <Absent>Chưa có tài khoản</Absent>
          )}
        </DetailRow>
        <DetailRow label="Số buổi còn lại">
          {overview.data ? (
            <>
              <Figures>{overview.data.credits_remaining}</Figures> buổi
            </>
          ) : (
            <Placeholder />
          )}
        </DetailRow>
        <DetailRow label="Gói đang hoạt động">
          {overview.data ? (
            overview.data.active_packages.length === 0 ? (
              <Absent>Chưa có gói đang dùng</Absent>
            ) : (
              overview.data.active_packages.map((item) => item.name).join(", ")
            )
          ) : (
            <Placeholder />
          )}
        </DetailRow>
        {overview.data?.needs_renewal ? (
          <DetailRow label="Gia hạn">
            <StatusBadge tone="attention">Cần liên hệ gia hạn</StatusBadge>
          </DetailRow>
        ) : null}
        {student.note ? <DetailRow label="Ghi chú">{student.note}</DetailRow> : null}
      </DetailList>

      <section className="mt-10 max-w-(--container-column)">
        <h2 className="text-ink text-sm font-medium">Lịch sử liên hệ gia hạn</h2>
        <p className="measure text-ink-2 mt-1 text-xs">
          Chỉ thêm, không sửa dòng cũ. Ghi nhận một lần liên hệ ở màn hình gia hạn.
        </p>

        {contacts.isPending ? (
          <SkeletonRows rows={2} className="mt-3" />
        ) : (contacts.data?.length ?? 0) === 0 ? (
          <EmptyState
            className="mt-3"
            title="Chưa liên hệ lần nào"
            description="Khi nhân viên ghi nhận một cuộc gọi gia hạn, nó xuất hiện ở đây."
          />
        ) : (
          <ul className="rule-t mt-3">
            {(contacts.data ?? []).map((contact) => (
              <li key={contact.id} className="rule-b py-3">
                <p className="text-ink text-sm">{contact.result}</p>
                <p className="text-ink-2 mt-1 text-xs">
                  <Figures className="text-ink">{formatDate(contact.contacted_at)}</Figures>{" "}
                  <Figures className="text-ink">{formatTime(contact.contacted_at)}</Figures>
                  {contact.next_contact_date ? (
                    <>
                      <span className="mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      hẹn lại{" "}
                      <Figures className="text-ink">
                        {formatDate(`${contact.next_contact_date}T00:00:00+07:00`)}
                      </Figures>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function CommerceTab({
  student,
  onSaved,
}: {
  student: StudentResponse;
  onSaved: (message: string) => void;
}) {
  const [selling, setSelling] = useState(false);
  const [recording, setRecording] = useState(false);
  const [renewing, setRenewing] = useState<StudentPackageResponse | null>(null);

  const packages = useStudentPackages({ student_id: student.id });
  const payments = usePayments({ student_id: student.id, limit: 200 });
  const record = useRecordPayment();

  return (
    <>
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-ink text-sm font-medium">Gói tập</h2>
          <Button size="sm" onClick={() => setSelling(true)}>
            Bán gói
          </Button>
        </div>

        <div className="mt-3">
          <QueryBoundary
            query={packages}
            skeletonRows={2}
            emptyTitle="Chưa có gói tập nào"
            emptyDescription="Học viên này chưa mua gói nào. Bán gói để cộng buổi vào tài khoản của họ."
            errorDescription="Không tải được gói tập của học viên."
          >
            {(items) => (
              <ul className="rule-t">
                {items.map((item) => (
                  <li key={item.id} className="rule-b py-4">
                    <PackageRow
                      item={item}
                      studentId={student.id}
                      onRenew={() => setRenewing(item)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-ink text-sm font-medium">Thanh toán</h2>
          <Button size="sm" variant="secondary" onClick={() => setRecording(true)}>
            Ghi nhận khoản thu
          </Button>
        </div>

        <div className="mt-3">
          <QueryBoundary
            query={payments}
            skeletonRows={3}
            emptyTitle="Chưa có khoản thu nào"
            emptyDescription="Các khoản thu gắn với gói của học viên này sẽ xuất hiện ở đây."
            errorDescription="Không tải được lịch sử thanh toán."
          >
            {(items) => <PaymentTable payments={items} />}
          </QueryBoundary>
        </div>
      </section>

      <Dialog open={selling} onOpenChange={setSelling}>
        <DialogContent
          title="Bán gói cho học viên"
          description="Bán gói tạo gói và cộng buổi ngay trong một giao dịch. Tiền ghi nhận ở bước sau."
        >
          <SellPackageForm
            student={student}
            onCancel={() => setSelling(false)}
            onSold={(name) => {
              setSelling(false);
              onSaved(`Đã bán gói ${name} cho ${student.full_name}.`);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={renewing !== null}
        onOpenChange={(next) => {
          if (!next) setRenewing(null);
        }}
      >
        {renewing ? (
          <DialogContent
            title="Gia hạn gói"
            description={`${renewing.name_snapshot}. Buổi gia hạn ghi vào sổ như một bút toán riêng, nên vẫn phân biệt được với lần bán đầu.`}
          >
            <RenewPackageForm
              item={renewing}
              onCancel={() => setRenewing(null)}
              onRenewed={() => {
                setRenewing(null);
                onSaved(`Đã gia hạn gói ${renewing.name_snapshot}.`);
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>

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
          description="Số tiền studio đã nhận, gắn với gói học viên đã mua."
        >
          <PaymentForm
            lockedStudent={{ id: student.id, fullName: student.full_name }}
            pending={record.isPending}
            error={record.error}
            onCancel={() => setRecording(false)}
            onSubmit={async (input) => {
              const created = await record.mutateAsync(input);
              setRecording(false);
              onSaved(`Đã ghi ${formatVnd(created.amount)}, đang chờ xác nhận.`);
              return created;
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * The class history.
 *
 * There is no history endpoint: `GET /my-schedule?student_id=` is the whole
 * record, and `assert_can_read_student` is what decides whether staff may read
 * this person's.
 */
function HistoryTab({ studentId }: { studentId: number }) {
  const query = useMySchedule({
    student_id: studentId,
    include_cancelled: true,
    limit: 500,
  });

  return (
    <QueryBoundary
      query={query}
      skeletonRows={5}
      emptyTitle="Chưa có buổi nào"
      emptyDescription="Học viên này chưa đăng ký buổi nào trong hệ thống."
      errorDescription="Không tải được lịch sử lớp."
      showErrorDetail
    >
      {(items) => {
        const newestFirst = [...items].sort(
          (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
        );

        return (
          <DataTable caption="Lịch sử lớp, mới nhất trước" minWidth="42rem">
            <thead>
              <tr>
                <Th>Buổi</Th>
                <Th>Hình thức</Th>
                <Th>Huấn luyện viên</Th>
                <Th>Trạng thái</Th>
              </tr>
            </thead>
            <tbody>
              {newestFirst.map((item: MyScheduleItem) => (
                <tr key={item.booking_id}>
                  <Td className="whitespace-nowrap">
                    <span className="text-ink-2 mr-2 text-xs">
                      {weekdayShort(item.starts_at)}
                    </span>
                    <Figures>{formatDate(item.starts_at)}</Figures>
                    <Figures className="text-ink-2 ml-2 text-xs">
                      {formatTime(item.starts_at)}
                    </Figures>
                  </Td>
                  <Td>{CLASS_TYPE[item.class_type]}</Td>
                  <Td className="text-ink-2">{item.trainer_name}</Td>
                  <Td>
                    <StatusBadge tone={BOOKING_STATUS[item.booking_status].tone}>
                      {BOOKING_STATUS[item.booking_status].label}
                    </StatusBadge>
                    {item.session_status === "CANCELLED" ? (
                      <span className="text-ink-2 text-2xs mt-1 block">
                        Studio đã hủy buổi
                      </span>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        );
      }}
    </QueryBoundary>
  );
}

/**
 * Progress photos. Listed here, opened one at a time — the bytes are behind the
 * token and re-authorised on every read, so there is no gallery of static URLs.
 */
function PhotosTab({ studentId }: { studentId: number }) {
  const query = useProgressPhotos(studentId);

  return (
    <>
      <p className="measure text-ink-2 text-xs">
        Ảnh xếp theo thời điểm chụp, để so sánh lúc bắt đầu với hiện tại. Mỗi lần xem đều
        được kiểm quyền lại — không có đường dẫn ảnh nào dùng lại được bên ngoài.
      </p>

      <div className="mt-3">
        <QueryBoundary
          query={query}
          skeletonRows={3}
          emptyTitle="Chưa có ảnh tiến trình"
          emptyDescription="Ảnh do học viên hoặc huấn luyện viên phụ trách tải lên."
          errorDescription="Không tải được danh sách ảnh."
        >
          {(photos) => (
            <ul className="rule-t">
              {photos.map((photo) => (
                <li
                  key={photo.id}
                  className="rule-b flex flex-wrap items-baseline justify-between gap-3 py-3"
                >
                  <span className="text-ink text-sm">
                    <Figures>{formatDate(photo.taken_at)}</Figures>{" "}
                    <Figures className="text-ink-2 text-xs">
                      {formatTime(photo.taken_at)}
                    </Figures>
                  </span>
                  <span className="text-ink-2 text-xs">
                    Tải lên bởi tài khoản #{photo.uploaded_by}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </QueryBoundary>
      </div>
    </>
  );
}

function PackageRow({
  item,
  studentId,
  onRenew,
}: {
  item: StudentPackageResponse;
  studentId: number;
  onRenew: () => void;
}) {
  const status = PACKAGE_STATUS[item.status];

  return (
    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0">
        <p className="text-ink text-sm">{item.name_snapshot}</p>
        <p className="text-ink-2 mt-1 text-xs">
          {CLASS_TYPE[item.class_type_snapshot]}
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          <Figures className="text-ink">{item.balance_cached}</Figures>/
          <Figures className="text-ink">{item.credits_snapshot}</Figures> buổi còn lại
        </p>
        <p className="text-ink-2 mt-1 text-xs">
          <Figures className="text-ink">
            {formatDate(`${item.start_date}T00:00:00+07:00`)}
          </Figures>{" "}
          –{" "}
          <Figures className="text-ink">
            {formatDate(`${item.end_date}T00:00:00+07:00`)}
          </Figures>
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          <Figures className="text-ink">{formatVnd(item.price_snapshot)}</Figures>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        <Button asChild size="sm" variant="secondary">
          <Link to={`/studio/so-buoi?goi=${item.id}&hv=${studentId}`}>Sổ buổi</Link>
        </Button>
        <Button size="sm" variant="secondary" onClick={onRenew}>
          Gia hạn
        </Button>
      </div>
    </div>
  );
}

function PaymentTable({ payments }: { payments: PaymentResponse[] }) {
  const newestFirst = [...payments].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
  );

  return (
    <DataTable caption="Thanh toán của học viên, mới nhất trước" minWidth="40rem">
      <thead>
        <tr>
          <Th>Ngày ghi</Th>
          <Th>Phương thức</Th>
          <Th numeric>Số tiền</Th>
          <Th>Trạng thái</Th>
        </tr>
      </thead>
      <tbody>
        {newestFirst.map((payment) => (
          <tr key={payment.id}>
            <Td className="whitespace-nowrap">
              <Figures>{formatDate(payment.recorded_at)}</Figures>
              <Figures className="text-ink-2 ml-2 text-xs">
                {formatTime(payment.recorded_at)}
              </Figures>
            </Td>
            <Td className="text-ink-2">{PAYMENT_METHOD[payment.method]}</Td>
            <Td numeric>
              <Figures className="whitespace-nowrap">{formatVnd(payment.amount)}</Figures>
            </Td>
            <Td>
              <StatusBadge tone={PAYMENT_STATUS[payment.status].tone}>
                {PAYMENT_STATUS[payment.status].label}
              </StatusBadge>
            </Td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function EditStudentForm({
  student,
  onCancel,
  onSaved,
}: {
  student: StudentResponse;
  onCancel: () => void;
  onSaved: (name: string) => void;
}) {
  const update = useUpdateStudent(student.id);

  return (
    <StudentForm
      defaultValues={{
        fullName: student.full_name,
        phone: student.phone,
        email: student.email ?? "",
        note: student.note ?? "",
      }}
      submitLabel="Lưu hồ sơ"
      pending={update.isPending}
      error={update.error}
      onCancel={onCancel}
      onSubmit={async (input) => {
        const saved = await update.mutateAsync(input);
        onSaved(saved.full_name);
        return saved;
      }}
    />
  );
}

/** Selling creates the package and credits it in one transaction. */
function SellPackageForm({
  student,
  onCancel,
  onSold,
}: {
  student: StudentResponse;
  onCancel: () => void;
  onSold: (packageName: string) => void;
}) {
  const types = usePackageTypes({ is_selling: true });
  const sell = useSellPackage();
  const [typeId, setTypeId] = useState("");
  const [startDate, setStartDate] = useState(() => studioDateKey(new Date()));

  const chosen = (types.data ?? []).find((item) => String(item.id) === typeId);

  return (
    <div className="flex flex-col gap-4">
      <Field label="Gói tập" required>
        {({ id }) => (
          <Select
            id={id}
            value={typeId}
            disabled={types.isPending}
            onChange={(event) => setTypeId(event.target.value)}
          >
            <option value="">
              {types.isPending ? "Đang tải danh mục…" : "— Chọn gói —"}
            </option>
            {(types.data ?? []).map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name} · {item.credits} buổi · {item.duration_days} ngày
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Ngày bắt đầu" required hint="Hạn dùng tính từ ngày này.">
        {({ id }) => (
          <Input
            id={id}
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        )}
      </Field>

      {chosen ? (
        <p className="text-ink-2 text-xs">
          Cộng ngay <Figures className="text-ink">{chosen.credits}</Figures> buổi cho{" "}
          {student.full_name}
          {chosen.price === null ? null : (
            <>
              , giá niêm yết{" "}
              <Figures className="text-ink">{formatVnd(chosen.price)}</Figures>
            </>
          )}
          .
        </p>
      ) : null}

      {sell.isError ? (
        <p role="alert" className="text-danger text-sm">
          {errorMessage(sell.error, "Chưa bán được gói. Vui lòng thử lại.")}
        </p>
      ) : null}

      <FormActions>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Huỷ
        </Button>
        <Button
          size="sm"
          pending={sell.isPending}
          disabled={typeId === ""}
          onClick={() => {
            sell.mutate(
              {
                student_id: student.id,
                package_type_id: Number(typeId),
                start_date: startDate,
              },
              { onSuccess: (sold) => onSold(sold.name_snapshot) },
            );
          }}
        >
          Bán gói
        </Button>
      </FormActions>
    </div>
  );
}

function RenewPackageForm({
  item,
  onCancel,
  onRenewed,
}: {
  item: StudentPackageResponse;
  onCancel: () => void;
  onRenewed: () => void;
}) {
  const renew = useRenewPackage(item.id);
  const [days, setDays] = useState("");
  const [credits, setCredits] = useState("");

  const nothingToDo = days.trim() === "" && credits.trim() === "";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cộng thêm buổi" hint="Bỏ trống nếu chỉ gia hạn ngày.">
          {({ id }) => (
            <Input
              id={id}
              inputMode="numeric"
              value={credits}
              onChange={(event) => setCredits(event.target.value)}
            />
          )}
        </Field>

        <Field label="Cộng thêm ngày" hint="Bỏ trống nếu chỉ cộng buổi.">
          {({ id }) => (
            <Input
              id={id}
              inputMode="numeric"
              value={days}
              onChange={(event) => setDays(event.target.value)}
            />
          )}
        </Field>
      </div>

      <p className="text-ink-2 text-xs">
        Hiện còn <Figures className="text-ink">{item.balance_cached}</Figures> buổi, hạn{" "}
        <Figures className="text-ink">
          {formatDate(`${item.end_date}T00:00:00+07:00`)}
        </Figures>
        .
      </p>

      {renew.isError ? (
        <p role="alert" className="text-danger text-sm">
          {errorMessage(renew.error, "Chưa gia hạn được gói. Vui lòng thử lại.")}
        </p>
      ) : null}

      <FormActions>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Huỷ
        </Button>
        <Button
          size="sm"
          pending={renew.isPending}
          disabled={nothingToDo}
          onClick={() => {
            renew.mutate(
              {
                extra_credits: credits.trim() === "" ? 0 : Number(credits),
                extra_days: days.trim() === "" ? 0 : Number(days),
              },
              { onSuccess: () => onRenewed() },
            );
          }}
        >
          Gia hạn
        </Button>
      </FormActions>
    </div>
  );
}

/** A figure the backend has not returned yet. The dash is decoration. */
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
