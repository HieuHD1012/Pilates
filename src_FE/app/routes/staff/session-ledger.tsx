import { useState } from "react";
import { Link, useSearchParams } from "react-router";

import { useAdjustSessions, useSessionLedger } from "~/features/commerce/queries";
import { SessionAdjustmentForm } from "~/features/commerce/session-adjustment-form";
import type { SessionLedger, SessionLedgerEntry } from "~/lib/api/types";
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
 * Nothing here is computed as policy: the deltas are the backend's, and the
 * running balance is arithmetic on them, shown so the number can be trusted.
 */

const REF_TYPE: Record<SessionLedgerEntry["refType"], string> = {
  purchase: "Mua gói",
  booking: "Đặt lớp",
  cancellation: "Hủy lớp",
  manual: "Điều chỉnh",
  expiry: "Hết hạn",
};

interface LedgerLine {
  entry: SessionLedgerEntry;
  /** Balance after this entry, i.e. the sum of every delta up to here. */
  balance: number;
}

/** Oldest first, so the running balance reads downward like a paper ledger. */
function withRunningBalance(entries: SessionLedgerEntry[]): LedgerLine[] {
  const chronological = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  let balance = 0;
  return chronological.map((entry) => {
    balance += entry.delta;
    return { entry, balance };
  });
}

export default function StaffSessionLedger() {
  const [searchParams] = useSearchParams();
  const studentPackageId = searchParams.get("goi");

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

  return <LedgerScreen studentPackageId={studentPackageId} />;
}

function LedgerScreen({ studentPackageId }: { studentPackageId: string }) {
  const query = useSessionLedger(studentPackageId);

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
        {(ledger) => <LedgerBody ledger={ledger} />}
      </QueryBoundary>
    </div>
  );
}

function LedgerBody({ ledger }: { ledger: SessionLedger }) {
  const [adjusting, setAdjusting] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const adjust = useAdjustSessions(ledger.studentPackageId);

  const lines = withRunningBalance(ledger.entries);
  const summed = lines.reduce((sum, line) => sum + line.entry.delta, 0);
  /**
   * The one check this screen exists for. `sessionsRemaining` is authoritative and
   * the ledger is its audit trail; if they disagree, the product must say so
   * rather than quietly showing whichever number it happened to render.
   */
  const reconciles = summed === ledger.sessionsRemaining;

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
            <div className="flex items-baseline gap-2">
              <dt>Học viên</dt>
              <dd>
                <Link
                  to={`/studio/hoc-vien/${ledger.studentId}`}
                  className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer underline underline-offset-[6px]"
                >
                  {ledger.studentName}
                </Link>
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Gói</dt>
              <dd className="text-ink">{ledger.packageName}</dd>
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
                  {formatNumber(ledger.sessionsRemaining)}
                </Figures>
                <span className="ml-1">buổi</span>
              </dd>
            </div>
          </dl>
        }
      />

      {reconciles ? null : (
        <p role="alert" className="rule-t border-t-danger/40 text-danger mt-4 pt-3 text-sm">
          Số dư của gói ({formatNumber(ledger.sessionsRemaining)}) không bằng tổng các bút
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
            <LedgerTable lines={lines} balance={summed} />
          </div>
          <div className="lg:hidden">
            <LedgerList lines={lines} balance={summed} />
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
          description={`${ledger.packageName} — ${ledger.studentName}. Bút toán này không xóa được; sửa sai bằng một bút toán ngược lại.`}
        >
          <SessionAdjustmentForm
            currentBalance={ledger.sessionsRemaining}
            pending={adjust.isPending}
            error={adjust.error}
            onCancel={() => setAdjusting(false)}
            onSubmit={async (input) => {
              const next = await adjust.mutateAsync(input);
              setAdjusting(false);
              setSaved(
                `Đã ghi bút toán. Số dư còn ${formatNumber(next.sessionsRemaining)} buổi.`,
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
function LedgerTable({ lines, balance }: { lines: LedgerLine[]; balance: number }) {
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
        {lines.map(({ entry, balance: running }) => (
          <Tr key={entry.id}>
            <Td className="align-top whitespace-nowrap">
              <Figures>{formatDate(entry.createdAt)}</Figures>
              <Figures className="text-ink-2 mt-0.5 block text-xs">
                {formatTime(entry.createdAt)}
              </Figures>
            </Td>
            <Td className="align-top">
              <span className="block max-w-[24rem]">{entry.reason}</span>
            </Td>
            <Td className="text-ink-2 align-top">{REF_TYPE[entry.refType]}</Td>
            <Td numeric className="align-top">
              <Figures className="whitespace-nowrap">{formatSigned(entry.delta)}</Figures>
            </Td>
            <Td numeric className="align-top">
              <Figures>{formatNumber(running)}</Figures>
            </Td>
            <Td className="text-ink-2 align-top">{entry.actorName}</Td>
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
function LedgerList({ lines, balance }: { lines: LedgerLine[]; balance: number }) {
  return (
    <>
      <ul className="rule-t">
        {lines.map(({ entry, balance: running }) => (
          <li key={entry.id} className="rule-b py-3.5">
            <div className="flex items-baseline justify-between gap-x-4">
              <span className="text-ink text-sm">{entry.reason}</span>
              <Figures className="text-ink shrink-0 text-sm">
                {formatSigned(entry.delta)}
              </Figures>
            </div>

            <p className="text-ink-2 mt-1.5 text-xs">
              <Figures className="text-ink">{formatDate(entry.createdAt)}</Figures>{" "}
              <Figures className="text-ink">{formatTime(entry.createdAt)}</Figures>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              {REF_TYPE[entry.refType]}
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              {entry.actorName}
            </p>

            <p className="text-ink-2 mt-1 text-xs">
              Số dư sau bút toán{" "}
              <Figures className="text-ink">{formatNumber(running)}</Figures> buổi
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
