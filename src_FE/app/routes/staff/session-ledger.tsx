import {
  ArrowRight,
  Ban,
  CalendarCheck,
  Package,
  PencilLine,
  RefreshCw,
  Undo2,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";

import {
  useAdjustCredits,
  usePackageLedger,
  useStudentPackages,
} from "~/features/commerce/queries";
import { SessionAdjustmentForm } from "~/features/commerce/session-adjustment-form";
import { useStudent } from "~/features/people/queries";
import type {
  LedgerEntryResponse,
  LedgerReasonCode,
  PackageLedgerResponse,
  StudentPackageResponse,
  StudentPackageStatus,
} from "~/lib/api/schema";
import { cn } from "~/lib/cn";
import {
  formatDate,
  formatNumber,
  formatPhone,
  formatSigned,
  formatTime,
} from "~/lib/format";
import { Absent } from "~/ui/absent";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { Dialog, DialogContent } from "~/ui/dialog";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { EmptyState, LiveRegion } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge, type StatusTone } from "~/ui/status";
import {
  Meter,
  Panel,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PersonCell,
  WorkspacePage,
} from "~/ui/workspace";

import type { Route } from "./+types/session-ledger";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Sổ buổi — J Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * The session ledger — the audit trail behind one package's balance.
 *
 * The whole screen exists to make one fact checkable: **the balance equals the
 * sum of the deltas.** That is a confirmed business rule, not a display
 * convention (docs/BUSINESS_RULES.md), so the screen is built so a studio
 * manager can verify it by eye — entries oldest first, a signed change column,
 * and a running balance beside it that a reader can follow downward to the total.
 *
 * Nothing here is computed as policy. In particular the balance column is the
 * backend's own `balance_after` for each row, not a total this screen adds up:
 * a client-side running total is a second ledger, and a second ledger is the
 * one that disagrees.
 */

const REASON_LABEL: Record<LedgerReasonCode, string> = {
  PACKAGE_SOLD: "Mua gói",
  PACKAGE_RENEWED: "Gia hạn gói",
  BOOKING_DEDUCT: "Đặt lớp",
  CANCEL_REFUND: "Hủy lớp",
  ADMIN_ADJUST: "Điều chỉnh tay",
  PAYMENT_VOID: "Hủy thanh toán",
};

/**
 * The kind of entry, as a tinted tag. The tint only groups the kinds (money in,
 * a class, a correction); the word is the information. A manual adjustment is
 * warning-toned rather than copper because the legend sets it beside the
 * danger-toned voided payment, and copper never shares a context with danger.
 */
const REASON_STYLE: Record<LedgerReasonCode, { className: string; icon: ReactNode }> = {
  PACKAGE_SOLD: {
    className: "bg-success-wash text-success",
    icon: <Package aria-hidden="true" />,
  },
  PACKAGE_RENEWED: {
    className: "bg-success-wash text-success",
    icon: <RefreshCw aria-hidden="true" />,
  },
  BOOKING_DEDUCT: {
    className: "bg-sand-deep text-ink-2",
    icon: <CalendarCheck aria-hidden="true" />,
  },
  CANCEL_REFUND: {
    className: "bg-info-wash text-info",
    icon: <Undo2 aria-hidden="true" />,
  },
  ADMIN_ADJUST: {
    className: "bg-warning-wash text-warning",
    icon: <PencilLine aria-hidden="true" />,
  },
  PAYMENT_VOID: {
    className: "bg-danger-wash text-danger",
    icon: <Ban aria-hidden="true" />,
  },
};

/**
 * What each kind of entry does to the balance, in the order a package lives
 * through them. Written as what the entry records, not as the rule that
 * produced it — whether a cancellation is refunded is the backend's decision.
 */
const REASON_MEANING: [LedgerReasonCode, string][] = [
  ["PACKAGE_SOLD", "cộng số buổi của gói"],
  ["PACKAGE_RENEWED", "ghi lần gia hạn của gói"],
  ["BOOKING_DEDUCT", "trừ buổi khi đặt lớp"],
  ["CANCEL_REFUND", "hoàn lại buổi đã trừ"],
  ["ADMIN_ADJUST", "cộng hoặc trừ, luôn kèm lý do"],
  ["PAYMENT_VOID", "thu hồi buổi của phiếu bị hủy"],
];

const PACKAGE_STATUS: Record<StudentPackageStatus, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: "Đang dùng", tone: "positive" },
  EXPIRED: { label: "Hết hạn", tone: "critical" },
  CANCELLED: { label: "Đã hủy", tone: "neutral" },
};

/** Oldest first, so the balance column reads downward like a paper ledger. */
function chronological(entries: LedgerEntryResponse[]): LedgerEntryResponse[] {
  return [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

/** A date-only calendar date, as the studio's own start of that day. */
function dateKeyToIso(dateKey: string): string {
  return `${dateKey}T00:00:00+07:00`;
}

const PAGE_DESCRIPTION =
  "Mỗi gói tập có một sổ riêng. Mọi lần cộng hoặc trừ buổi đều ghi một dòng, kèm lý do và người thực hiện. Số dư luôn bằng tổng các dòng.";

export default function StaffSessionLedger() {
  const [searchParams] = useSearchParams();
  const studentPackageId = searchParams.get("goi");
  // Optional, and carried by the link from the student profile: the ledger
  // itself names no student and no package, so without it the screen says
  // which package by id rather than guessing at a name.
  const studentId = searchParams.get("hv");

  /**
   * A ledger belongs to a package, so there is no such thing as "the" ledger.
   * This screen used to default to one hard-coded package id, which meant the nav
   * item opened one arbitrary student's sessions and looked authoritative doing it.
   * Without a package it says how to reach one, rather than opening empty.
   */
  if (!studentPackageId) {
    return (
      <WorkspacePage>
        <PageHeader title="Sổ buổi" description={PAGE_DESCRIPTION} />
        <NoPackageChosen />
      </WorkspacePage>
    );
  }

  return (
    <LedgerScreen
      studentPackageId={Number(studentPackageId)}
      studentId={studentId === null ? null : Number(studentId)}
    />
  );
}

/**
 * The nav item lands here. There is no endpoint that lists every package in the
 * studio, so the screen cannot offer a picker; it gives the route to a package
 * instead, and the one link that starts it.
 */
function NoPackageChosen() {
  return (
    <div className="grid gap-5 md:gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <Panel>
        <PanelHeader
          title="Chưa chọn gói nào"
          description="Sổ buổi mở theo từng gói tập, không phải theo toàn studio."
        />
        <PanelBody>
          <ol className="flex flex-col gap-3">
            {[
              "Mở danh sách học viên và chọn người cần xem.",
              "Trong hồ sơ, chuyển sang tab “Gói & thanh toán”.",
              "Bấm “Sổ buổi” ở gói cần đối chiếu.",
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className="bg-sand-deep text-copper-2 figures grid size-7 shrink-0 place-items-center rounded-full text-xs"
                >
                  {index + 1}
                </span>
                <span className="text-ink pt-1">{step}</span>
              </li>
            ))}
          </ol>
        </PanelBody>
        <PanelFooter>
          <span>Sổ mở ra sẽ ghi tên học viên và gói ở đầu trang.</span>
          <Button asChild variant="secondary" size="sm" className="max-md:min-h-11">
            <Link to="/studio/hoc-vien">
              Danh sách học viên
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </PanelFooter>
      </Panel>

      <ReasonLegend />
    </div>
  );
}

function LedgerScreen({
  studentPackageId,
  studentId,
}: {
  studentPackageId: number;
  studentId: number | null;
}) {
  const query = usePackageLedger(studentPackageId);

  return (
    <WorkspacePage>
      {/* One block, so the boundary's refresh hairline sits on the content
          rather than taking a gap of the page's own. */}
      <div>
        <QueryBoundary
          query={query}
          skeletonRows={6}
          showErrorDetail
          errorDescription="Không tải được sổ buổi của gói này. Mã gói có thể không còn đúng."
          emptyTitle="Không tìm thấy gói này"
          emptyDescription="Mở sổ buổi từ hồ sơ học viên để chắc chắn đúng gói."
        >
          {(ledger) => <LedgerBody ledger={ledger} studentId={studentId} />}
        </QueryBoundary>
      </div>
    </WorkspacePage>
  );
}

function LedgerBody({
  ledger,
  studentId,
}: {
  ledger: PackageLedgerResponse;
  studentId: number | null;
}) {
  const [adjusting, setAdjusting] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const adjust = useAdjustCredits(ledger.student_package_id);

  const student = useStudent(studentId);
  const packages = useStudentPackages(
    { student_id: studentId ?? undefined },
    { enabled: studentId !== null },
  );
  const thisPackage = (packages.data ?? []).find(
    (item) => item.id === ledger.student_package_id,
  );
  const packageName = thisPackage?.name_snapshot ?? `Gói #${ledger.student_package_id}`;

  const lines = chronological(ledger.entries);
  const summed = lines.reduce((sum, line) => sum + line.delta, 0);
  /**
   * The one check this screen exists for. `closing_balance` is authoritative
   * and the entries are its audit trail; if they disagree the product must say
   * so rather than quietly showing whichever number it happened to render.
   */
  const reconciles = summed === ledger.closing_balance;
  const studentName = student.data?.full_name ?? `Học viên #${studentId}`;

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <PageHeader
        title="Sổ buổi"
        description={PAGE_DESCRIPTION}
        actions={
          <Button
            variant="secondary"
            className="max-md:min-h-11"
            icon={<PencilLine className="size-4" aria-hidden="true" />}
            onClick={() => setAdjusting(true)}
          >
            Điều chỉnh buổi
          </Button>
        }
      />

      {/* Whose ledger this is, before any number. The canvas drew two pickers
          here; with no endpoint that lists packages studio-wide, the screen
          names the student and package it was opened for instead. */}
      <Panel aria-label="Gói đang xem">
        <dl className="grid gap-x-8 gap-y-4 px-4 py-4 md:grid-cols-2 md:px-5">
          {studentId !== null ? (
            <div className="min-w-0">
              <dt className="text-ink text-sm font-medium">Học viên</dt>
              <dd className="mt-2">
                <PersonCell
                  avatarName={student.data?.full_name}
                  name={
                    <Link
                      to={`/studio/hoc-vien/${studentId}`}
                      className="decoration-rule-2 hover:text-copper hover:decoration-copper underline underline-offset-[6px]"
                    >
                      {studentName}
                    </Link>
                  }
                  detail={
                    student.data ? (
                      <Figures>{formatPhone(student.data.phone)}</Figures>
                    ) : undefined
                  }
                />
              </dd>
            </div>
          ) : null}
          <div className="min-w-0">
            <dt className="text-ink text-sm font-medium">Gói</dt>
            <dd className="mt-2 flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-ink text-sm font-medium">{packageName}</span>
              {thisPackage ? (
                <>
                  <span className="text-ink-2 text-xs">
                    <Figures>{formatDate(dateKeyToIso(thisPackage.start_date))}</Figures>
                    <span className="mx-1">–</span>
                    <Figures>{formatDate(dateKeyToIso(thisPackage.end_date))}</Figures>
                  </span>
                  <StatusBadge tone={PACKAGE_STATUS[thisPackage.status].tone}>
                    {PACKAGE_STATUS[thisPackage.status].label}
                  </StatusBadge>
                </>
              ) : null}
            </dd>
          </div>
        </dl>
      </Panel>

      {reconciles ? null : (
        <p
          role="alert"
          className="border-danger/40 bg-danger-wash text-danger rounded-lg border px-4 py-3 text-sm"
        >
          Số dư của gói ({formatNumber(ledger.closing_balance)}) không bằng tổng các bút
          toán ({formatNumber(summed)}). Đừng điều chỉnh thêm trước khi đối chiếu lại — một
          trong hai con số đang sai.
        </p>
      )}

      <div className="grid gap-5 md:gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <Panel>
          <PanelHeader
            title="Các thay đổi của gói"
            description={
              <>
                Cũ nhất trước · <Figures>{formatNumber(ledger.entries.length)}</Figures>{" "}
                dòng
              </>
            }
            actions={<DemoDataNotice />}
          />
          {ledger.entries.length === 0 ? (
            <EmptyState
              className="px-4 py-8 md:px-5"
              title="Sổ buổi của gói này chưa có bút toán nào"
              description="Mỗi lần mua gói, đặt lớp, hủy lớp hoặc điều chỉnh buổi đều tạo một bút toán ở đây, kèm lý do và người thực hiện."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <LedgerTable entries={lines} balance={ledger.closing_balance} />
              </div>
              <div className="md:hidden">
                <LedgerList entries={lines} balance={ledger.closing_balance} />
              </div>
            </>
          )}
        </Panel>

        <div className="flex flex-col gap-5 md:gap-6">
          <BalancePanel
            balance={ledger.closing_balance}
            thisPackage={thisPackage}
            studentId={studentId}
          />
          <ReasonLegend />
        </div>
      </div>

      <LiveRegion message={saved} />

      <Dialog
        open={adjusting}
        onOpenChange={(next) => {
          if (!next) {
            adjust.reset();
            setAdjusting(false);
          }
        }}
      >
        <DialogContent
          busy={adjust.isPending}
          title="Điều chỉnh buổi"
          description={`${packageName}. Bút toán này không xóa được; sửa sai bằng một bút toán ngược lại.`}
        >
          <SessionAdjustmentForm
            currentBalance={ledger.closing_balance}
            pending={adjust.isPending}
            error={adjust.error}
            onCancel={() => setAdjusting(false)}
            onSubmit={async (input) => {
              const next = await adjust.mutateAsync(input);
              setAdjusting(false);
              setSaved(
                `Đã ghi bút toán. Số dư còn ${formatNumber(next.balance_cached)} buổi.`,
              );
              return next;
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The balance as the panel's one figure. "Trên N" and the meter need the
 * package's own session count, so they appear only once the package is known
 * (the link from the student profile carries it); the expiry is the package's
 * stored date, not a countdown this screen works out.
 */
function BalancePanel({
  balance,
  thisPackage,
  studentId,
}: {
  balance: number;
  thisPackage: StudentPackageResponse | undefined;
  studentId: number | null;
}) {
  return (
    <Panel>
      <PanelHeader title="Số dư gói" />
      <PanelBody>
        <p className="flex items-baseline gap-2.5">
          {/* The size sits on its own span: tailwind-merge reads `text-d2` as a
              colour and would drop one of the two inside <Figures>. */}
          <span className="text-d2 leading-none">
            <Figures display className="text-ink">
              {formatNumber(balance)}
            </Figures>
          </span>
          <span className="text-ink-2 text-sm">
            buổi còn lại
            {thisPackage ? (
              <>
                {" "}
                trên <Figures>{formatNumber(thisPackage.credits_snapshot)}</Figures>
              </>
            ) : null}
          </span>
        </p>
        {thisPackage ? (
          <>
            <Meter value={balance} max={thisPackage.credits_snapshot} className="mt-3" />
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-ink-2 text-xs">Bắt đầu</dt>
                <dd className="mt-0.5">
                  <Figures className="text-ink">
                    {formatDate(dateKeyToIso(thisPackage.start_date))}
                  </Figures>
                </dd>
              </div>
              <div>
                <dt className="text-ink-2 text-xs">Hạn dùng</dt>
                <dd className="mt-0.5">
                  <Figures className="text-ink">
                    {formatDate(dateKeyToIso(thisPackage.end_date))}
                  </Figures>
                </dd>
              </div>
            </dl>
          </>
        ) : null}
      </PanelBody>
      {studentId !== null ? (
        <PanelFooter>
          <Link
            to={`/studio/hoc-vien/${studentId}`}
            className="text-copper hover:text-copper-2 inline-flex min-h-11 items-center gap-1.5 md:min-h-0"
          >
            Mở hồ sơ học viên
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </PanelFooter>
      ) : null}
    </Panel>
  );
}

function ReasonTag({ reason }: { reason: LedgerReasonCode }) {
  const style = REASON_STYLE[reason];
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        "[&>svg]:size-3.5 [&>svg]:shrink-0",
        style.className,
      )}
    >
      {style.icon}
      {REASON_LABEL[reason]}
    </span>
  );
}

function ReasonLegend() {
  return (
    <Panel>
      <PanelHeader title="Các loại thay đổi" />
      <PanelBody>
        <dl className="flex flex-col gap-3">
          {REASON_MEANING.map(([reason, meaning]) => (
            <div
              key={reason}
              className="grid grid-cols-[8.75rem_minmax(0,1fr)] items-center gap-3"
            >
              <dt>
                <ReasonTag reason={reason} />
              </dt>
              <dd className="text-ink-2 text-sm">{meaning}</dd>
            </div>
          ))}
        </dl>
      </PanelBody>
    </Panel>
  );
}

/** A signed change. Credit in the success ink; a deduction stays secondary. */
function Delta({ value, className }: { value: number; className?: string }) {
  return (
    <Figures
      className={cn(
        "whitespace-nowrap",
        value > 0 ? "text-success" : "text-ink-2",
        className,
      )}
    >
      {formatSigned(value)}
    </Figures>
  );
}

/**
 * md and up. Two right-aligned numeric columns sit side by side at the row's
 * edge on purpose: the change and the balance it produces. Reading them as a
 * pair is the verification this screen is for.
 */
function LedgerTable({
  entries,
  balance,
}: {
  entries: LedgerEntryResponse[];
  balance: number;
}) {
  return (
    <DataTable caption="Sổ buổi của gói, cũ nhất trước" minWidth="42rem">
      <thead>
        <tr>
          <Th>Thời điểm</Th>
          <Th>Loại</Th>
          <Th>Lý do</Th>
          <Th>Người thực hiện</Th>
          <Th numeric>Thay đổi</Th>
          <Th numeric>Số dư</Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <Tr key={entry.id}>
            <Td className="whitespace-nowrap">
              <Figures>{formatDate(entry.created_at)}</Figures>
              <Figures className="text-ink-2 mt-0.5 block text-xs">
                {formatTime(entry.created_at)}
              </Figures>
            </Td>
            <Td>
              <ReasonTag reason={entry.reason_code} />
            </Td>
            <Td className="text-ink-2">
              {/* The kind has its own column; repeating it here when there is
                  no note would read as a reason someone wrote. */}
              <span className="block max-w-[22rem]">
                {entry.note ?? <Absent>Không ghi chú</Absent>}
              </span>
            </Td>
            <Td className="text-ink-2 whitespace-nowrap">
              Tài khoản #{entry.actor_user_id}
            </Td>
            <Td numeric>
              <Delta value={entry.delta} className="text-base" />
            </Td>
            <Td numeric>
              <Figures className="text-ink text-base">
                {formatNumber(entry.balance_after)}
              </Figures>
            </Td>
          </Tr>
        ))}
      </tbody>
      {/* The total row closes the ledger. It carries the same figure twice —
          sum of the changes, and the balance — because that identity is the
          point of the screen. Its own rule sits above it (the last body row
          drops its rule), and the panel's edge closes it below. */}
      <tfoot>
        <tr className="bg-sand">
          <Td colSpan={4} className="rule-t border-b-0!">
            <span className="text-ink font-medium">Số dư hiện tại</span>{" "}
            <span className="text-ink-2">= tổng các thay đổi</span>
          </Td>
          <Td numeric className="rule-t border-b-0!">
            <Figures className="text-ink text-base whitespace-nowrap">
              {formatSigned(balance)}
            </Figures>
          </Td>
          <Td numeric className="rule-t border-b-0!">
            <Figures className="text-ink text-2xl leading-none">
              {formatNumber(balance)}
            </Figures>
          </Td>
        </tr>
      </tfoot>
    </DataTable>
  );
}

/**
 * Below md the ledger becomes ruled rows, each carrying its own resulting
 * balance, and closes with the same total the table's foot shows.
 */
function LedgerList({
  entries,
  balance,
}: {
  entries: LedgerEntryResponse[];
  balance: number;
}) {
  return (
    <>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id} className="rule-b px-4 py-3.5">
            <div className="flex items-start justify-between gap-x-4">
              <div className="min-w-0">
                <ReasonTag reason={entry.reason_code} />
                {entry.note ? (
                  <p className="text-ink mt-1.5 text-sm">{entry.note}</p>
                ) : null}
              </div>
              <Delta value={entry.delta} className="shrink-0 text-lg" />
            </div>

            <p className="text-ink-2 mt-1.5 text-xs">
              <Figures className="text-ink">{formatDate(entry.created_at)}</Figures>{" "}
              <Figures className="text-ink">{formatTime(entry.created_at)}</Figures>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              Tài khoản #{entry.actor_user_id}
            </p>

            <p className="text-ink-2 mt-1 text-xs">
              Số dư sau bút toán{" "}
              <Figures className="text-ink">{formatNumber(entry.balance_after)}</Figures>{" "}
              buổi
            </p>
          </li>
        ))}
      </ul>

      <div className="bg-sand flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-b-lg px-4 py-3">
        <span className="text-sm">
          <span className="text-ink font-medium">Số dư hiện tại</span>{" "}
          <span className="text-ink-2">= tổng các thay đổi</span>
        </span>
        <span className="text-ink text-sm">
          <Figures className="text-2xl leading-none">{formatNumber(balance)}</Figures> buổi
        </span>
      </div>
    </>
  );
}
