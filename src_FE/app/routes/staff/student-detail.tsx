import {
  ChevronRight,
  DoorOpen,
  KeyRound,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useState, type ReactNode } from "react";
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
  IsoDate,
  MyScheduleItem,
  PackageSummary,
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
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Dialog, DialogContent } from "~/ui/dialog";
import { EmptyState, LiveRegion, Skeleton, SkeletonRows } from "~/ui/feedback";
import { Field, FormActions, Input, Select } from "~/ui/field";
import { Figures } from "~/ui/figure";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";
import { Tab, TabList, TabPanel, Tabs } from "~/ui/tabs";
import {
  Avatar,
  Meter,
  Panel,
  PanelBody,
  PanelFooter,
  PanelHeader,
  WorkspacePage,
} from "~/ui/workspace";

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
 * What the renew dialog needs to know about a package. Both the overview's
 * package summary and the full package row can supply it, so either tab can
 * open the one dialog.
 */
interface RenewTarget {
  id: number;
  name: string;
  balance: number;
  endDate: IsoDate;
}

/** A date-only value from the backend, read in the studio's timezone. */
function dateOnly(value: IsoDate): string {
  return formatDate(`${value}T00:00:00+07:00`);
}

/**
 * One student, assembled from the endpoints that each own a piece of them.
 *
 * There is no single "student detail" response, and that is the right shape:
 * `/students/{id}` is the profile, `/students/{id}/overview` is credits and
 * active packages, `/packages` is what they bought, `/payments` is what they
 * paid, `/my-schedule` is what they attended. Each tab fetches what it asks;
 * the profile header reads the overview too, which the default tab loads anyway.
 *
 * The page is a profile panel (who, how to reach them, what to do next) with
 * the tabs at its foot, then each tab as a main column and a 360px side column
 * of panels. Selling and renewing are opened from either tab, so their dialogs
 * live here rather than inside one tab.
 *
 * The progress-photos tab is **absent for STAFF**, not disabled: showing it and
 * catching the 403 tells a receptionist that photographs of this person exist.
 */
export default function StaffStudentDetail() {
  const [editing, setEditing] = useState(false);
  const [selling, setSelling] = useState(false);
  const [renewing, setRenewing] = useState<RenewTarget | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const { studentId = "" } = useParams();
  const id = Number(studentId);
  const query = useStudent(id);
  const session = useSession();

  // ADMIN, the student themselves and their trainer may look. STAFF may not.
  const maySeePhotos = session.data?.role === "ADMIN";

  return (
    <WorkspacePage>
      <LiveRegion message={saved} />

      <nav aria-label="Đường dẫn" className="text-ink-2 flex items-center gap-1.5 text-sm">
        <Link
          to="/studio/hoc-vien"
          className="decoration-rule-2 hover:text-ink underline underline-offset-[6px]"
        >
          Học viên
        </Link>
        {query.data ? (
          <>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
            <span aria-current="page" className="min-w-0 truncate">
              {query.data.full_name}
            </span>
          </>
        ) : null}
      </nav>

      <QueryBoundary
        query={query}
        isEmpty={() => false}
        loading={
          <Panel as="div" className="px-4 py-5 md:px-6 md:py-6">
            <div className="flex items-center gap-5">
              <Skeleton className="size-14 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-7 w-64" />
                <Skeleton className="mt-3 h-3 w-48" />
              </div>
            </div>
            <SkeletonRows rows={4} className="mt-6" />
          </Panel>
        }
        errorDescription="Không tải được thông tin học viên. Học viên có thể đã được gộp hoặc đường dẫn không còn đúng."
        showErrorDetail
      >
        {(student) => (
          <>
            <Tabs defaultValue="tong-quan">
              <ProfileHeader
                student={student}
                maySeePhotos={maySeePhotos}
                onEdit={() => setEditing(true)}
                onSell={() => setSelling(true)}
              />

              <TabPanel value="tong-quan">
                <OverviewTab student={student} onRenew={setRenewing} />
              </TabPanel>

              <TabPanel value="goi-thanh-toan">
                <CommerceTab student={student} onSaved={setSaved} onRenew={setRenewing} />
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
                    setSaved(`Đã bán gói ${name} cho ${student.full_name}.`);
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
                  description={`${renewing.name}. Buổi gia hạn ghi vào sổ như một bút toán riêng, nên vẫn phân biệt được với lần bán đầu.`}
                >
                  <RenewPackageForm
                    target={renewing}
                    onCancel={() => setRenewing(null)}
                    onRenewed={() => {
                      setRenewing(null);
                      setSaved(`Đã gia hạn gói ${renewing.name}.`);
                    }}
                  />
                </DialogContent>
              ) : null}
            </Dialog>
          </>
        )}
      </QueryBoundary>
    </WorkspacePage>
  );
}

/**
 * Who this is, how to reach them, and what to do next — shown on every tab.
 * The tab list sits at the panel's foot, its active rule on the panel's edge.
 *
 * "Gọi" is copper because it is the contact action (ADR 0006, decision 9);
 * "Bán gói" is the screen's one ink ask.
 */
function ProfileHeader({
  student,
  maySeePhotos,
  onEdit,
  onSell,
}: {
  student: StudentResponse;
  maySeePhotos: boolean;
  onEdit: () => void;
  onSell: () => void;
}) {
  const overview = useStudentOverview(student.id);
  const status = STUDENT_STATUS[student.status];

  return (
    <Panel aria-labelledby="student-name">
      <div className="flex flex-wrap items-start gap-x-5 gap-y-4 px-4 pt-5 pb-5 md:px-6 md:pt-6">
        <Avatar name={student.full_name} size="xl" />

        <div className="min-w-0 flex-1 basis-64">
          <h1
            id="student-name"
            className="font-display text-ink text-[1.625rem] leading-tight font-normal tracking-[-0.01em] md:text-[2rem]"
          >
            {student.full_name}
          </h1>

          <ul className="text-ink-2 mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm [&_svg]:size-4 [&_svg]:shrink-0">
            <li className="inline-flex items-center gap-1.5">
              <Phone aria-hidden="true" />
              <span className="sr-only">Điện thoại</span>
              <Figures className="text-ink">{formatPhone(student.phone)}</Figures>
            </li>
            <li className="inline-flex items-center gap-1.5">
              <DoorOpen aria-hidden="true" />
              Vào studio{" "}
              <Figures className="text-ink">{formatDate(student.created_at)}</Figures>
            </li>
            <li className="inline-flex items-center gap-1.5">
              <KeyRound aria-hidden="true" />
              {student.user_id !== null ? "Đã có tài khoản" : "Chưa có tài khoản"}
            </li>
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            {overview.data?.needs_renewal ? (
              <StatusBadge tone="attention">Cần liên hệ gia hạn</StatusBadge>
            ) : null}
            <DemoDataNotice />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild variant="copper">
            <a href={telHref(student.phone)}>
              <Phone className="size-4" aria-hidden="true" />
              <span>Gọi</span>
            </a>
          </Button>
          <Button
            variant="secondary"
            icon={<Pencil className="size-4" aria-hidden="true" />}
            onClick={onEdit}
          >
            Sửa hồ sơ
          </Button>
          <Button icon={<Plus className="size-4" aria-hidden="true" />} onClick={onSell}>
            Bán gói
          </Button>
        </div>
      </div>

      {/* Pulled down one pixel so the list's own hairline lies on the panel's
          border instead of doubling it. */}
      <div className="-mb-px">
        <TabList label="Thông tin học viên" className="rule-t px-4 md:px-6">
          <Tab value="tong-quan">Tổng quan</Tab>
          <Tab value="goi-thanh-toan">Gói &amp; thanh toán</Tab>
          <Tab value="lich-su">Lịch sử lớp</Tab>
          {maySeePhotos ? <Tab value="anh">Ảnh tiến trình</Tab> : null}
        </TabList>
      </div>
    </Panel>
  );
}

/** Main column and a 360px side column, stacked below xl. */
function TabGrid({ main, side }: { main: ReactNode; side?: ReactNode }) {
  return (
    <div className="grid items-start gap-5 md:gap-6 xl:grid-cols-[minmax(0,1fr)_22.5rem]">
      <div className="flex min-w-0 flex-col gap-5 md:gap-6">{main}</div>
      {side ? <div className="flex min-w-0 flex-col gap-5 md:gap-6">{side}</div> : null}
    </div>
  );
}

/** Credits and active packages, counted from the ledger by the backend. */
function OverviewTab({
  student,
  onRenew,
}: {
  student: StudentResponse;
  onRenew: (target: RenewTarget) => void;
}) {
  return (
    <TabGrid
      main={<ActivePackagesPanel student={student} onRenew={onRenew} />}
      side={
        <>
          <RenewalContactsPanel studentId={student.id} />
          <StudentInfoPanel student={student} />
        </>
      }
    />
  );
}

/**
 * The active package, led by the one number staff come here for: sessions
 * left. The overview reports what remains, not what was bought, so there is no
 * meter here — the full package row under "Gói & thanh toán" has both.
 */
function ActivePackagesPanel({
  student,
  onRenew,
}: {
  student: StudentResponse;
  onRenew: (target: RenewTarget) => void;
}) {
  const overview = useStudentOverview(student.id);
  const data = overview.data;
  const several = (data?.active_packages.length ?? 0) > 1;

  return (
    <Panel>
      <PanelHeader
        title="Gói đang dùng"
        description={
          data && several ? (
            <>
              <Figures>{data.active_packages.length}</Figures> gói · tổng{" "}
              <Figures>{data.credits_remaining}</Figures> buổi còn lại
            </>
          ) : undefined
        }
      />

      <div className="px-4 md:px-5">
        <QueryBoundary
          query={overview}
          skeletonRows={3}
          isEmpty={(value) => value.active_packages.length === 0}
          emptyTitle="Chưa có gói đang dùng"
          emptyDescription="Bán gói để cộng buổi vào tài khoản của học viên này."
          errorDescription="Không tải được tình trạng gói tập."
        >
          {(value) => (
            <ul className="-mx-4 md:-mx-5">
              {value.active_packages.map((item) => (
                <li key={item.id} className="rule-b last:border-b-0">
                  <ActivePackage
                    item={item}
                    studentId={student.id}
                    onRenew={() =>
                      onRenew({
                        id: item.id,
                        name: item.name,
                        balance: item.credits_remaining,
                        endDate: item.end_date,
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </QueryBoundary>
      </div>

      {data?.needs_renewal ? (
        <PanelFooter className="bg-warning-wash/45 text-ink flex-nowrap items-start justify-start gap-2.5 rounded-b-lg">
          {/* The backend decides the threshold and only says whether it is
              reached, so the note names no number of sessions or days. */}
          <TriangleAlert
            className="text-warning mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span className="min-w-0">Học viên này đang ở ngưỡng cần liên hệ gia hạn.</span>
        </PanelFooter>
      ) : null}
    </Panel>
  );
}

function ActivePackage({
  item,
  studentId,
  onRenew,
}: {
  item: PackageSummary;
  studentId: number;
  onRenew: () => void;
}) {
  return (
    <div className="grid gap-5 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_13rem] md:px-5">
      <div className="min-w-0">
        <p className="text-ink flex flex-wrap items-center gap-2 text-sm font-medium">
          {item.name}
          <ClassTypeTag type={item.class_type} />
        </p>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2.5">
          <Figures display className="text-ink text-d2 leading-none">
            {item.credits_remaining}
          </Figures>{" "}
          <span className="text-ink-2 text-sm">buổi còn lại</span>
        </p>
        <p className="text-ink-2 mt-3 text-xs">
          Bắt đầu <Figures className="text-ink">{dateOnly(item.start_date)}</Figures>
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          <Figures className="text-ink">{formatVnd(item.price)}</Figures>
        </p>
      </div>

      <div className="sm:rule-l flex flex-col gap-3 sm:pl-5">
        <div>
          <p className="text-ink-2 text-xs">Hạn dùng</p>
          <Figures display className="text-ink mt-0.5 block text-xl">
            {dateOnly(item.end_date)}
          </Figures>
          {item.days_remaining > 0 ? (
            <p className="text-ink-2 text-xs">
              còn <Figures className="text-ink">{item.days_remaining}</Figures> ngày
            </p>
          ) : null}
        </div>
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          icon={<RefreshCw className="size-4" aria-hidden="true" />}
          onClick={onRenew}
        >
          Gia hạn gói
        </Button>
        <LedgerLink packageId={item.id} studentId={studentId} />
      </div>
    </div>
  );
}

function RenewalContactsPanel({ studentId }: { studentId: number }) {
  const contacts = useRenewalHistory(studentId);

  return (
    <Panel>
      <PanelHeader
        title="Lịch sử liên hệ gia hạn"
        description="Chỉ thêm, không sửa dòng cũ. Ghi nhận một lần liên hệ ở màn hình gia hạn."
      />
      <div className="px-4 md:px-5">
        {contacts.isPending ? (
          <SkeletonRows rows={2} className="py-4" />
        ) : (contacts.data?.length ?? 0) === 0 ? (
          <EmptyState
            className="py-6"
            title="Chưa liên hệ lần nào"
            description="Khi nhân viên ghi nhận một cuộc gọi gia hạn, nó xuất hiện ở đây."
          />
        ) : (
          <ul className="-mx-4 md:-mx-5">
            {(contacts.data ?? []).map((contact) => (
              <li key={contact.id} className="rule-b px-4 py-3 last:border-b-0 md:px-5">
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
                        {dateOnly(contact.next_contact_date)}
                      </Figures>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <PanelFooter>
        <Link
          to="/studio/gia-han"
          className="text-ink decoration-rule-2 hover:text-copper hover:decoration-copper underline underline-offset-[6px]"
        >
          Mở danh sách gia hạn
        </Link>
      </PanelFooter>
    </Panel>
  );
}

/**
 * The rest of the record. Phone, joining date and login sit in the profile
 * header, shown on every tab — so they are not repeated here.
 */
function StudentInfoPanel({ student }: { student: StudentResponse }) {
  return (
    <Panel>
      <PanelHeader title="Thông tin học viên" />
      <PanelBody>
        <dl className="flex flex-col gap-4">
          <Fact label="Email">{student.email ?? <Absent>Chưa ghi</Absent>}</Fact>
          <Fact label="Ngày sinh">
            {student.dob ? (
              <Figures>{dateOnly(student.dob)}</Figures>
            ) : (
              <Absent>Chưa ghi</Absent>
            )}
          </Fact>
          <Fact label="Ghi chú">{student.note ?? <Absent>Chưa ghi</Absent>}</Fact>
        </dl>
      </PanelBody>
    </Panel>
  );
}

/** A fact of the record: label above value, no rule between them. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-2 text-sm">{label}</dt>
      <dd className="text-ink mt-1 text-sm wrap-anywhere">{children}</dd>
    </div>
  );
}

function CommerceTab({
  student,
  onSaved,
  onRenew,
}: {
  student: StudentResponse;
  onSaved: (message: string) => void;
  onRenew: (target: RenewTarget) => void;
}) {
  const [recording, setRecording] = useState(false);

  const packages = useStudentPackages({ student_id: student.id });
  const payments = usePayments({ student_id: student.id, limit: 200 });
  const record = useRecordPayment();

  return (
    <>
      <TabGrid
        main={
          <Panel>
            <PanelHeader title="Gói tập" description="Các gói học viên này đã mua." />
            <div className="px-4 md:px-5">
              <QueryBoundary
                query={packages}
                skeletonRows={2}
                emptyTitle="Chưa có gói tập nào"
                emptyDescription="Học viên này chưa mua gói nào. Bán gói để cộng buổi vào tài khoản của họ."
                errorDescription="Không tải được gói tập của học viên."
              >
                {(items) => (
                  <ul className="-mx-4 md:-mx-5">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="rule-b px-4 py-4 last:border-b-0 md:px-5"
                      >
                        <PackageRow
                          item={item}
                          studentId={student.id}
                          onRenew={() =>
                            onRenew({
                              id: item.id,
                              name: item.name_snapshot,
                              balance: item.balance_cached,
                              endDate: item.end_date,
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </QueryBoundary>
            </div>
          </Panel>
        }
        side={
          <Panel>
            <PanelHeader
              title="Thanh toán"
              actions={
                <Button size="sm" variant="secondary" onClick={() => setRecording(true)}>
                  Ghi nhận khoản thu
                </Button>
              }
            />
            <div className="px-4 md:px-5">
              <QueryBoundary
                query={payments}
                skeletonRows={3}
                emptyTitle="Chưa có khoản thu nào"
                emptyDescription="Các khoản thu gắn với gói của học viên này sẽ xuất hiện ở đây."
                errorDescription="Không tải được lịch sử thanh toán."
              >
                {(items) => <PaymentList payments={items} />}
              </QueryBoundary>
            </div>
          </Panel>
        }
      />

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
    <Panel>
      <PanelHeader title="Lịch sử lớp" description="Mới nhất trước, gồm cả buổi đã hủy." />
      <div className="px-4 md:px-5">
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
              <div className="-mx-4 md:-mx-5">
                <ul className="md:hidden">
                  {newestFirst.map((item) => (
                    <li key={item.booking_id} className="rule-b px-4 py-4 last:border-b-0">
                      <p className="text-ink-2 text-sm">
                        {weekdayShort(item.starts_at)} ·{" "}
                        <Figures>
                          {formatDate(item.starts_at)} {formatTime(item.starts_at)}
                        </Figures>
                      </p>
                      <p className="text-ink mt-1.5 text-base">
                        {CLASS_TYPE[item.class_type]}
                      </p>
                      <p className="text-ink-2 mt-0.5 text-sm">{item.trainer_name}</p>
                      <StatusBadge
                        className="mt-2"
                        tone={BOOKING_STATUS[item.booking_status].tone}
                      >
                        {BOOKING_STATUS[item.booking_status].label}
                      </StatusBadge>
                      {item.session_status === "CANCELLED" ? (
                        <p className="text-ink-2 mt-1 text-sm">Studio đã hủy buổi</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block">
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
                        <tr key={item.booking_id} className="[&:last-child>td]:border-b-0">
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
                </div>
              </div>
            );
          }}
        </QueryBoundary>
      </div>
    </Panel>
  );
}

/**
 * Progress photos. Listed here, opened one at a time — the bytes are behind the
 * token and re-authorised on every read, so there is no gallery of static URLs.
 */
function PhotosTab({ studentId }: { studentId: number }) {
  const query = useProgressPhotos(studentId);

  return (
    <Panel>
      <PanelHeader
        title="Ảnh tiến trình"
        description="Các mốc chụp ảnh giúp theo dõi tiến trình của học viên theo thời gian."
      />
      <div className="px-4 md:px-5">
        <QueryBoundary
          query={query}
          skeletonRows={3}
          emptyTitle="Chưa có ảnh tiến trình"
          emptyDescription="Ảnh do học viên hoặc huấn luyện viên phụ trách tải lên."
          errorDescription="Không tải được danh sách ảnh."
        >
          {(photos) => (
            <ul className="-mx-4 md:-mx-5">
              {photos.map((photo) => (
                <li
                  key={photo.id}
                  className="rule-b flex flex-wrap items-baseline justify-between gap-3 px-4 py-3 last:border-b-0 md:px-5"
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
    </Panel>
  );
}

/**
 * One package the student bought. Remaining against bought is written as a
 * fraction and drawn as a meter beside it — the meter repeats the number, it
 * never replaces it. The row's one button is renewing; the ledger is a link,
 * because opening it changes nothing.
 */
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
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-ink text-sm font-medium">{item.name_snapshot}</p>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>
        <p className="text-ink-2 mt-1 text-xs">
          {CLASS_TYPE[item.class_type_snapshot]}
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          <Figures className="text-ink">{dateOnly(item.start_date)}</Figures> –{" "}
          <Figures className="text-ink">{dateOnly(item.end_date)}</Figures>
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          <Figures className="text-ink">{formatVnd(item.price_snapshot)}</Figures>
        </p>

        <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5 text-sm">
          <Figures display className="text-ink text-2xl leading-none">
            {item.balance_cached}
          </Figures>
          <span className="text-ink-2">
            / <Figures>{item.credits_snapshot}</Figures> buổi còn lại
          </span>
        </p>
        <Meter
          value={item.balance_cached}
          max={item.credits_snapshot}
          className="mt-2 max-w-xs"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-col sm:items-end">
        <Button
          size="sm"
          variant="secondary"
          icon={<RefreshCw className="size-4" aria-hidden="true" />}
          onClick={onRenew}
        >
          Gia hạn
        </Button>
        <LedgerLink packageId={item.id} studentId={studentId} />
      </div>
    </div>
  );
}

function LedgerLink({ packageId, studentId }: { packageId: number; studentId: number }) {
  return (
    <Link
      to={`/studio/so-buoi?goi=${packageId}&hv=${studentId}`}
      className="text-ink decoration-rule-2 hover:text-copper hover:decoration-copper inline-flex min-h-10 items-center text-sm underline underline-offset-[6px]"
    >
      Xem sổ buổi
    </Link>
  );
}

function ClassTypeTag({ type }: { type: ClassType }) {
  return (
    <span className="bg-sand-deep text-ink-2 rounded-sm px-1.5 py-0.5 text-xs font-normal">
      {CLASS_TYPE[type]}
    </span>
  );
}

/**
 * Payments as a list rather than a table: the side column is 360px, and an
 * amount, how it was paid, when, and whether it is confirmed read as one line
 * pair per payment at that width.
 */
function PaymentList({ payments }: { payments: PaymentResponse[] }) {
  const newestFirst = [...payments].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
  );

  return (
    <ul aria-label="Thanh toán của học viên, mới nhất trước" className="-mx-4 md:-mx-5">
      {newestFirst.map((payment) => (
        <li
          key={payment.id}
          className="rule-b flex items-start justify-between gap-3 px-4 py-3.5 last:border-b-0 md:px-5"
        >
          <div className="min-w-0">
            <Figures className="text-ink text-lg">{formatVnd(payment.amount)}</Figures>
            <p className="text-ink-2 mt-0.5 text-xs">
              {PAYMENT_METHOD[payment.method]}
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              ghi lúc{" "}
              <Figures className="whitespace-nowrap">
                {formatDate(payment.recorded_at)} {formatTime(payment.recorded_at)}
              </Figures>
            </p>
          </div>
          <StatusBadge className="shrink-0" tone={PAYMENT_STATUS[payment.status].tone}>
            {PAYMENT_STATUS[payment.status].label}
          </StatusBadge>
        </li>
      ))}
    </ul>
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
  target,
  onCancel,
  onRenewed,
}: {
  target: RenewTarget;
  onCancel: () => void;
  onRenewed: () => void;
}) {
  const renew = useRenewPackage(target.id);
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
        Hiện còn <Figures className="text-ink">{target.balance}</Figures> buổi, hạn{" "}
        <Figures className="text-ink">{dateOnly(target.endDate)}</Figures>.
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
