import { useState } from "react";

import {
  useAccounts,
  useCreateAccount,
  useSetAccountStatus,
} from "~/features/people/queries";
import { AccountForm } from "~/features/people/account-form";
import type { AccountRow, Role } from "~/lib/api/types";
import { formatDate, formatTime } from "~/lib/format";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { DetailList, DetailRow } from "~/ui/detail-list";
import { Dialog, DialogContent } from "~/ui/dialog";
import { LiveRegion } from "~/ui/feedback";
import { Figures } from "~/ui/figure";
import { PageHeader } from "~/ui/layout";
import { QueryBoundary } from "~/ui/query-boundary";
import { StatusBadge } from "~/ui/status";

import type { Route } from "./+types/accounts";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tài khoản — Soul Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * Login accounts and access.
 *
 * The winning subject is the person who signs in; role, status and last sign-in
 * are attributes of that person, and the row carries exactly one action.
 *
 * Locking is an authorization change, so it follows Reference C to the letter:
 * the consequence is stated before the action, the action is confirmed in a
 * dialog naming the person, nothing is applied optimistically, the button keeps
 * its label while pending, and the backend's own error text never reaches the
 * screen. The result then replaces the action — the row's badge and its button
 * both flip once the backend has confirmed.
 *
 * No `text-lacquer` accent on the locked count on purpose: a locked account
 * already renders a `danger` badge, and lacquer must never share a context with
 * danger (docs/DESIGN_SYSTEM.md).
 */

const ROLE_LABEL: Record<Role, string> = {
  student: "Học viên",
  trainer: "Huấn luyện viên",
  staff: "Nhân viên",
  owner: "Chủ studio",
};

/** The identifier is a phone number or an email; only the former is a figure. */
function isPhoneIdentifier(identifier: string): boolean {
  return /^[\d+\s().-]+$/.test(identifier);
}

type Result = { fullName: string; status: AccountRow["status"] };

export default function StaffAccounts() {
  const query = useAccounts();
  const setAccountStatus = useSetAccountStatus();
  const create = useCreateAccount();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  /** The account awaiting confirmation — also the dialog's open state. */
  const [target, setTarget] = useState<AccountRow | null>(null);
  /** The last confirmed outcome, kept so the screen states what it did. */
  const [result, setResult] = useState<Result | null>(null);

  const accounts = query.data ?? [];
  const lockedCount = accounts.filter((account) => account.status === "locked").length;

  function ask(account: AccountRow) {
    setResult(null);
    setAccountStatus.reset();
    setTarget(account);
  }

  function close() {
    // Never dismissable mid-flight: the authorization is not yet decided.
    if (setAccountStatus.isPending) return;
    setTarget(null);
    setAccountStatus.reset();
  }

  function applyStatus() {
    if (!target) return;
    const next = target.status === "active" ? "locked" : "active";
    void setAccountStatus
      .mutateAsync({ id: target.id, status: next })
      .then(() => {
        setResult({ fullName: target.fullName, status: next });
        setTarget(null);
      })
      // The dialog stays open on failure, carrying the error beside the retry.
      .catch(() => {});
  }

  return (
    <div className="gutter py-6">
      <LiveRegion
        message={created ? `Đã tạo tài khoản cho ${created}. Lời mời đã được gửi.` : null}
      />

      <LiveRegion
        message={
          result
            ? result.status === "locked"
              ? `Đã khóa tài khoản của ${result.fullName}.`
              : `Đã mở lại tài khoản của ${result.fullName}.`
            : setAccountStatus.isError && target
              ? `Chưa cập nhật được tài khoản của ${target.fullName}.`
              : null
        }
      />

      <PageHeader
        title="Tài khoản"
        description="Những người đăng nhập được vào hệ thống của studio, với vai trò và quyền truy cập của từng người."
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            Tạo tài khoản
          </Button>
        }
        meta={
          <dl className="text-ink-2 flex flex-wrap items-baseline gap-x-8 gap-y-2 text-xs">
            <div className="flex items-baseline gap-2">
              <dt>Số tài khoản</dt>
              <dd>
                <Figures className="text-ink">{accounts.length}</Figures>
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt>Đang khóa</dt>
              <dd>
                <Figures className="text-ink">{lockedCount}</Figures>
              </dd>
            </div>
          </dl>
        }
      />

      <DemoDataNotice className="mt-3" />

      {result ? (
        <p className="text-ink-2 mt-3 text-xs">
          {result.status === "locked" ? (
            <>
              Đã khóa tài khoản của <span className="text-ink">{result.fullName}</span>.
              Người này sẽ không đăng nhập được cho tới khi được mở lại.
            </>
          ) : (
            <>
              Đã mở lại tài khoản của <span className="text-ink">{result.fullName}</span>.
              Người này đăng nhập được ngay.
            </>
          )}
        </p>
      ) : null}

      <div className="mt-3">
        <QueryBoundary
          query={query}
          skeletonRows={6}
          emptyTitle="Chưa có tài khoản nào"
          emptyDescription="Danh sách tài khoản sẽ xuất hiện ở đây khi hệ thống ghi nhận người đăng nhập đầu tiên."
          errorDescription="Không tải được danh sách tài khoản."
          showErrorDetail
        >
          {(items) => (
            <>
              {/* From lg up: the five columns staff scan down, plus the action. */}
              <div className="hidden lg:block">
                <DataTable caption="Tài khoản đăng nhập của studio" minWidth="56rem">
                  <thead>
                    <tr>
                      <Th>Họ tên</Th>
                      <Th>Điện thoại hoặc email</Th>
                      <Th>Vai trò</Th>
                      <Th>Trạng thái</Th>
                      <Th numeric>Đăng nhập lần cuối</Th>
                      <Th className="text-right">Truy cập</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((account) => (
                      <Tr key={account.id}>
                        {/* Names wrap; a Vietnamese name is never truncated. */}
                        <Td>{account.fullName}</Td>
                        <Td>
                          {isPhoneIdentifier(account.identifier) ? (
                            <Figures className="text-ink-2 whitespace-nowrap">
                              {account.identifier}
                            </Figures>
                          ) : (
                            <span className="text-ink-2 break-words">
                              {account.identifier}
                            </span>
                          )}
                        </Td>
                        <Td className="text-ink-2">{ROLE_LABEL[account.role]}</Td>
                        <Td>
                          <AccountStatus status={account.status} />
                        </Td>
                        <Td numeric className="whitespace-nowrap">
                          <LastSignIn at={account.lastSignInAt} />
                        </Td>
                        <Td className="text-right">
                          <AccessButton account={account} onAsk={ask} />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>

              {/* Below lg the table becomes ruled rows: the same facts, one
                  full-width action, no sideways scroll (docs/RESPONSIVE.md). */}
              <ul className="rule-t lg:hidden">
                {items.map((account) => (
                  <li key={account.id} className="rule-b py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
                      <span className="text-ink min-w-0 text-sm">{account.fullName}</span>
                      <AccountStatus status={account.status} />
                    </div>

                    <p className="text-ink-2 mt-2 text-xs">
                      {isPhoneIdentifier(account.identifier) ? (
                        <Figures>{account.identifier}</Figures>
                      ) : (
                        <span className="break-words">{account.identifier}</span>
                      )}
                      <span className="mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      {ROLE_LABEL[account.role]}
                    </p>

                    <p className="text-ink-2 mt-1.5 text-xs">
                      Đăng nhập lần cuối <LastSignIn at={account.lastSignInAt} />
                    </p>

                    <div className="mt-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() => ask(account)}
                      >
                        {account.status === "active"
                          ? "Khóa tài khoản"
                          : "Mở lại tài khoản"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </QueryBoundary>
      </div>

      <p className="rule-t text-ink-2 mt-6 pt-3 text-xs">
        Tạo tài khoản mới chưa có trong hệ thống, nên màn hình này chỉ khóa hoặc mở lại
        quyền đăng nhập của những người đã có tài khoản.
      </p>

      <Dialog open={target !== null} onOpenChange={(open) => (open ? null : close())}>
        {target ? (
          <DialogContent
            title={target.status === "active" ? "Khóa tài khoản" : "Mở lại tài khoản"}
            description={`${target.fullName} · ${ROLE_LABEL[target.role]}`}
            footer={
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={close}
                  disabled={setAccountStatus.isPending}
                >
                  Quay lại
                </Button>
                {/* The label stays put while pending (UI_PATTERNS, mutations). */}
                <Button
                  variant={target.status === "active" ? "danger" : "primary"}
                  size="sm"
                  pending={setAccountStatus.isPending}
                  onClick={applyStatus}
                >
                  {target.status === "active" ? "Khóa tài khoản" : "Mở lại tài khoản"}
                </Button>
              </>
            }
          >
            {/* The consequence, before the action. */}
            <p className="text-ink text-sm">
              {target.status === "active" ? (
                <>
                  Người này sẽ không đăng nhập được cho tới khi được mở lại. Lớp đã đặt và
                  dữ liệu của người này không bị thay đổi.
                </>
              ) : (
                <>
                  Người này sẽ đăng nhập lại được ngay, với vai trò{" "}
                  {ROLE_LABEL[target.role].toLowerCase()} như trước.
                </>
              )}
            </p>

            <DetailList className="mt-4">
              <DetailRow label="Điện thoại hoặc email" labelWidth="9.5rem">
                {isPhoneIdentifier(target.identifier) ? (
                  <Figures>{target.identifier}</Figures>
                ) : (
                  <span className="break-words">{target.identifier}</span>
                )}
              </DetailRow>
              <DetailRow label="Trạng thái hiện tại" labelWidth="9.5rem">
                <AccountStatus status={target.status} />
              </DetailRow>
              <DetailRow label="Đăng nhập lần cuối" labelWidth="9.5rem">
                <LastSignIn at={target.lastSignInAt} />
              </DetailRow>
            </DetailList>

            {setAccountStatus.isError ? (
              /* Contextual copy only — the backend's message is never shown. */
              <p role="alert" className="text-danger mt-4 text-sm">
                {target.status === "active"
                  ? "Chưa khóa được tài khoản này. Quyền truy cập vẫn giữ nguyên như trước."
                  : "Chưa mở lại được tài khoản này. Quyền truy cập vẫn giữ nguyên như trước."}{" "}
                Vui lòng thử lại.
              </p>
            ) : null}
          </DialogContent>
        ) : null}
      </Dialog>
      <Dialog
        open={creating}
        onOpenChange={(next) => {
          if (!next) {
            create.reset();
            setCreating(false);
          }
        }}
      >
        <DialogContent
          title="Tạo tài khoản"
          description="Người này sẽ nhận lời mời và tự đặt mật khẩu. Studio không đặt mật khẩu thay ai."
        >
          <AccountForm
            pending={create.isPending}
            error={create.error}
            onCancel={() => setCreating(false)}
            onSubmit={async (input) => {
              const account = await create.mutateAsync(input);
              setCreating(false);
              setCreated(account.fullName);
              return account;
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountStatus({ status }: { status: AccountRow["status"] }) {
  return status === "locked" ? (
    <StatusBadge tone="critical">Đã khóa</StatusBadge>
  ) : (
    <StatusBadge tone="positive">Đang hoạt động</StatusBadge>
  );
}

/**
 * The one action per row. Locking is destructive, so it carries the danger
 * tone; unlocking restores access and stays secondary.
 */
function AccessButton({
  account,
  onAsk,
}: {
  account: AccountRow;
  onAsk: (account: AccountRow) => void;
}) {
  const locking = account.status === "active";

  return (
    <Button
      variant={locking ? "danger" : "secondary"}
      size="sm"
      onClick={() => onAsk(account)}
      aria-label={
        locking
          ? `Khóa tài khoản của ${account.fullName}`
          : `Mở lại tài khoản của ${account.fullName}`
      }
    >
      {locking ? "Khóa" : "Mở lại"}
    </Button>
  );
}

/**
 * A sign-in that has never happened is an em dash: decoration for the eye, with
 * the meaning written out for assistive technology — never the string "null".
 */
function LastSignIn({ at }: { at: string | null }) {
  if (at === null) {
    return (
      <>
        <span aria-hidden="true" className="text-ink-2">
          —
        </span>
        <span className="sr-only">chưa đăng nhập lần nào</span>
      </>
    );
  }

  return (
    <>
      <Figures className="text-ink">{formatDate(at)}</Figures>{" "}
      <Figures className="text-ink-2 text-xs">{formatTime(at)}</Figures>
    </>
  );
}
