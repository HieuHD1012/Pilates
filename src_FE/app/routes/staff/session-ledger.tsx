import { useState } from "react";
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
} from "~/lib/api/schema";
import { formatDate, formatNumber, formatSigned, formatTime } from "~/lib/format";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { Dialog, DialogContent } from "~/ui/dialog";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { EmptyState, LiveRegion } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";

import type { Route } from "./+types/session-ledger";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Sổ buổi — Soul Pilates" }, { name: "robots", content: "noindex" }];
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

/** Oldest first, so the balance column reads downward like a paper ledger. */
function chronological(entries: LedgerEntryResponse[]): LedgerEntryResponse[] {
  return [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

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
   */
  if (!studentPackageId) {
    return (
      <div className="gutter py-6">
        <PageHeader
          title="Sổ buổi"
          description="Mỗi gói tập có một sổ buổi riêng. Chọn gói để mở sổ của gói đó."
        />
        <EmptyState
          className="mt-4"
          title="Chưa chọn gói nào"
          description="Sổ buổi mở theo từng gói tập, không phải theo toàn studio. Vào hồ sơ học viên, tab Gói & thanh toán, rồi mở sổ của gói cần xem."
          action={
            <Button asChild variant="secondary">
              <Link to="/studio/hoc-vien">Danh sách học viên</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <LedgerScreen
      studentPackageId={Number(studentPackageId)}
      studentId={studentId === null ? null : Number(studentId)}
    />
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
    <div className="gutter py-6">
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

  return (
    <>
      <PageHeader
        title="Sổ buổi"
        description="Toàn bộ lần cộng và trừ buổi của một gói, cũ nhất trước. Số dư của gói luôn bằng tổng các thay đổi trong sổ này."
        actions={
          <Button size="sm" variant="secondary" onClick={() => setAdjusting(true)}>
            Điều chỉnh buổi
          </Button>
        }
        meta={
          <dl className="text-ink-2 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-xs">
            {studentId !== null ? (
              <div className="flex items-baseline gap-2">
                <dt>Học viên</dt>
                <dd>
                  <Link
                    to={`/studio/hoc-vien/${studentId}`}
                    className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[6px]"
                  >
                    {student.data?.full_name ?? `Học viên #${studentId}`}
                  </Link>
                </dd>
              </div>
            ) : null}
            <div className="flex items-baseline gap-2">
              <dt>Gói</dt>
              <dd className="text-ink">{packageName}</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Số bút toán</dt>
              <dd>
                <Figures className="text-ink">
                  {formatNumber(ledger.entries.length)}
                </Figures>
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Số dư</dt>
              <dd>
                <Figures className="text-ink">
                  {formatNumber(ledger.closing_balance)}
                </Figures>
                <span className="ml-1">buổi</span>
              </dd>
            </div>
          </dl>
        }
      />

      {reconciles ? null : (
        <p role="alert" className="rule-t border-t-danger/40 text-danger mt-4 pt-3 text-sm">
          Số dư của gói ({formatNumber(ledger.closing_balance)}) không bằng tổng các bút
          toán ({formatNumber(summed)}). Đừng điều chỉnh thêm trước khi đối chiếu lại — một
          trong hai con số đang sai.
        </p>
      )}

      <DemoDataNotice className="mt-3 mb-3" />

      {ledger.entries.length === 0 ? (
        <EmptyState
          title="Sổ buổi của gói này chưa có bút toán nào"
          description="Mỗi lần mua gói, đặt lớp, hủy lớp hoặc điều chỉnh buổi đều tạo một bút toán ở đây, kèm lý do và người thực hiện."
        />
      ) : (
        <>
          <div className="hidden lg:block">
            <LedgerTable entries={lines} balance={ledger.closing_balance} />
          </div>
          <div className="lg:hidden">
            <LedgerList entries={lines} balance={ledger.closing_balance} />
          </div>
        </>
      )}

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
    </>
  );
}

/**
 * 1440 / 1024. Two right-aligned numeric columns sit side by side on purpose:
 * the change and the balance it produces. Reading them as a pair is the
 * verification this screen is for.
 */
function LedgerTable({
  entries,
  balance,
}: {
  entries: LedgerEntryResponse[];
  balance: number;
}) {
  return (
    <DataTable caption="Sổ buổi của gói, cũ nhất trước" minWidth="58rem">
      <thead>
        <tr>
          <Th>Thời điểm</Th>
          <Th>Lý do</Th>
          <Th>Loại</Th>
          <Th numeric>Thay đổi</Th>
          <Th numeric>Số dư</Th>
          <Th>Người thực hiện</Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <Tr key={entry.id}>
            <Td className="align-top whitespace-nowrap">
              <Figures>{formatDate(entry.created_at)}</Figures>
              <Figures className="text-ink-2 mt-0.5 block text-xs">
                {formatTime(entry.created_at)}
              </Figures>
            </Td>
            <Td className="align-top">
              <span className="block max-w-[24rem]">
                {entry.note ?? REASON_LABEL[entry.reason_code]}
              </span>
            </Td>
            <Td className="text-ink-2 align-top">{REASON_LABEL[entry.reason_code]}</Td>
            <Td numeric className="align-top">
              <Figures className="whitespace-nowrap">{formatSigned(entry.delta)}</Figures>
            </Td>
            <Td numeric className="align-top">
              <Figures>{formatNumber(entry.balance_after)}</Figures>
            </Td>
            <Td className="text-ink-2 align-top">Tài khoản #{entry.actor_user_id}</Td>
          </Tr>
        ))}
      </tbody>
      {/* The total row closes the ledger. It carries the same figure twice —
          sum of the changes, and the balance — because that identity is the
          point of the screen. The hairline above it is the last row's rule. */}
      <tfoot>
        <Tr>
          <Td colSpan={3} className="text-ink-2 text-xs">
            Số dư bằng tổng các thay đổi
          </Td>
          <Td numeric>
            <Figures className="text-ink font-medium whitespace-nowrap">
              {formatSigned(balance)}
            </Figures>
          </Td>
          <Td numeric>
            <Figures className="text-ink font-medium">{formatNumber(balance)}</Figures>
          </Td>
          <Td />
        </Tr>
      </tfoot>
    </DataTable>
  );
}

/**
 * Below lg the ledger becomes ruled rows, each carrying its own resulting
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
      <ul className="rule-t">
        {entries.map((entry) => (
          <li key={entry.id} className="rule-b py-3.5">
            <div className="flex items-baseline justify-between gap-x-4">
              <span className="text-ink text-sm">
                {entry.note ?? REASON_LABEL[entry.reason_code]}
              </span>
              <Figures className="text-ink shrink-0 text-sm">
                {formatSigned(entry.delta)}
              </Figures>
            </div>

            <p className="text-ink-2 mt-1.5 text-xs">
              <Figures className="text-ink">{formatDate(entry.created_at)}</Figures>{" "}
              <Figures className="text-ink">{formatTime(entry.created_at)}</Figures>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              {REASON_LABEL[entry.reason_code]}
            </p>

            <p className="text-ink-2 mt-1 text-xs">
              Số dư sau bút toán{" "}
              <Figures className="text-ink">{formatNumber(entry.balance_after)}</Figures>{" "}
              buổi
            </p>
          </li>
        ))}
      </ul>

      <div className="rule-t flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pt-3">
        <span className="text-ink-2 text-xs">Số dư bằng tổng các thay đổi</span>
        <span className="text-ink text-sm">
          <Figures className="font-medium">{formatNumber(balance)}</Figures> buổi
        </span>
      </div>
    </>
  );
}
