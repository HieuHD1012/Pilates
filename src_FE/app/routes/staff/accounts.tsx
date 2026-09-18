import { useState } from "react";

import {
  useAccounts,
  useCreateAccount,
  useSendPasswordReset,
  useSetAccountLocked,
} from "~/features/people/queries";
import { AccountForm } from "~/features/people/account-form";
import type { AccountResponse, Role } from "~/lib/api/schema";
import { formatDate, formatPhone, formatTime } from "~/lib/format";
import { Absent } from "~/ui/absent";
import { Button } from "~/ui/button";
import { DataTable, Td, Th, Tr } from "~/ui/data-table";
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
  STUDENT: "Học viên",
  TRAINER: "Huấn luyện viên",
  STAFF: "Nhân viên",
  ADMIN: "Quản trị",
};

type Result = { fullName: string; locked: boolean };

export default function StaffAccounts() {
  const query = useAccounts({ limit: 200 });
  const create = useCreateAccount();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  /** The account awaiting confirmation — also the dialog's open state. */
  const [target, setTarget] = useState<AccountResponse | null>(null);
  /** The last confirmed outcome, kept so the screen states what it did. */
  const [result, setResult] = useState<Result | null>(null);

  // The lock mutation belongs to the account being confirmed, so it is created
  // for that id rather than taking one as an argument.
  const setLocked = useSetAccountLocked(target?.id ?? 0);

  const accounts = query.data ?? [];
  const lockedCount = accounts.filter((account) => !account.is_active).length;

  function ask(account: AccountResponse) {
    setResult(null);
    setLocked.reset();
    setTarget(account);
  }

  function close() {
    // Never dismissable mid-flight: the authorization is not yet decided.
    if (setLocked.isPending) return;
    setTarget(null);
    setLocked.reset();
  }

  function applyStatus() {
    if (!target) return;
    const lock = target.is_active;
    void setLocked
      .mutateAsync(lock)
      .then(() => {
        setResult({ fullName: target.full_name ?? target.email, locked: lock });
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
            ? result.locked
              ? `Đã khóa tài khoản của ${result.fullName}.`
              : `Đã mở lại tài khoản của ${result.fullName}.`
            : setLocked.isError && target
              ? `Chưa cập nhật được tài khoản của ${target.full_name ?? target.email}.`
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

      {result ? (
        <p className="text-ink-2 mt-3 text-xs">
          {result.locked ? (
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
                      <Th>Email đăng nhập</Th>
                      <Th>Điện thoại</Th>
                      <Th>Vai trò</Th>
                      <Th>Trạng thái</Th>
                      <Th numeric>Tạo lúc</Th>
                      <Th className="text-right">Truy cập</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((account) => (
                      <Tr key={account.id}>
                        {/* Names wrap; a Vietnamese name is never truncated. */}
                        <Td>{account.full_name ?? <Absent>Chưa ghi tên</Absent>}</Td>
                        <Td>
                          <span className="text-ink-2 break-words">{account.email}</span>
                        </Td>
                        <Td>
                          {account.phone ? (
                            <Figures className="text-ink-2 whitespace-nowrap">
                              {formatPhone(account.phone)}
                            </Figures>
                          ) : (
                            <Absent>Chưa ghi</Absent>
                          )}
                        </Td>
                        <Td className="text-ink-2">{ROLE_LABEL[account.role]}</Td>
                        <Td>
                          <AccountStatus account={account} />
                        </Td>
                        <Td numeric className="whitespace-nowrap">
                          <Figures className="text-ink">
                            {formatDate(account.created_at)}
                          </Figures>{" "}
                          <Figures className="text-ink-2 text-xs">
                            {formatTime(account.created_at)}
                          </Figures>
                        </Td>
                        <Td className="text-right">
                          <RowActions account={account} onAsk={ask} />
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
                      <span className="text-ink min-w-0 text-sm">
                        {account.full_name ?? account.email}
                      </span>
                      <AccountStatus account={account} />
                    </div>

                    <p className="text-ink-2 mt-2 text-xs">
                      <span className="break-words">{account.email}</span>
                      <span className="mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      {ROLE_LABEL[account.role]}
                    </p>

                    <p className="text-ink-2 mt-1.5 text-xs">
                      Tạo lúc{" "}
                      <Figures className="text-ink">
                        {formatDate(account.created_at)}
                      </Figures>
                    </p>

                    <div className="mt-3 flex flex-col gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() => ask(account)}
                      >
                        {account.is_active ? "Khóa tài khoản" : "Mở lại tài khoản"}
                      </Button>
                      <ResendInvite account={account} fullWidth />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </QueryBoundary>
      </div>

      <p className="rule-t text-ink-2 mt-6 pt-3 text-xs">
        Khóa tài khoản thu hồi luôn mọi phiên đang mở, không chỉ chặn lần đăng nhập sau.
        Studio không đặt mật khẩu thay ai — “Gửi lại liên kết” để người đó tự đặt.
      </p>

      <Dialog open={target !== null} onOpenChange={(open) => (open ? null : close())}>
        {target ? (
          <DialogContent
            title={target.is_active ? "Khóa tài khoản" : "Mở lại tài khoản"}
            description={`${target.full_name ?? target.email} · ${ROLE_LABEL[target.role]}`}
            footer={
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={close}
                  disabled={setLocked.isPending}
                >
                  Quay lại
                </Button>
                {/* The label stays put while pending (UI_PATTERNS, mutations). */}
                <Button
                  variant={target.is_active ? "danger" : "primary"}
                  size="sm"
                  pending={setLocked.isPending}
                  onClick={applyStatus}
                >
                  {target.is_active ? "Khóa tài khoản" : "Mở lại tài khoản"}
                </Button>
              </>
            }
          >
            {/* The consequence, before the action. */}
            <p className="text-ink text-sm">
              {target.is_active ? (
                <>
                  Mọi phiên đang mở của người này bị thu hồi ngay, và họ không đăng nhập
                  được cho tới khi được mở lại. Lớp đã đặt và dữ liệu không bị thay đổi.
                </>
              ) : (
                <>
                  Người này sẽ đăng nhập lại được ngay, với vai trò{" "}
                  {ROLE_LABEL[target.role].toLowerCase()} như trước.
                </>
              )}
            </p>

            <DetailList className="mt-4">
              <DetailRow label="Email đăng nhập" labelWidth="9.5rem">
                <span className="break-words">{target.email}</span>
              </DetailRow>
              <DetailRow label="Trạng thái hiện tại" labelWidth="9.5rem">
                <AccountStatus account={target} />
              </DetailRow>
              <DetailRow label="Tạo lúc" labelWidth="9.5rem">
                <Figures>{formatDate(target.created_at)}</Figures>
              </DetailRow>
            </DetailList>

            {setLocked.isError ? (
              /* Contextual copy only — the backend's message is never shown. */
              <p role="alert" className="text-danger mt-4 text-sm">
                {target.is_active
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
              setCreated(account.full_name ?? account.email);
              return account;
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Two independent facts, not one status. `is_active` is whether the studio has
 * locked the account; `status` is whether the person has finished setting a
 * password. A locked account that never activated is both, and collapsing them
 * into one badge would hide whichever came second.
 */
function AccountStatus({ account }: { account: AccountResponse }) {
  if (!account.is_active) return <StatusBadge tone="critical">Đã khóa</StatusBadge>;
  if (account.status === "PENDING_ACTIVATION") {
    return <StatusBadge tone="attention">Chưa đặt mật khẩu</StatusBadge>;
  }
  return <StatusBadge tone="positive">Đang hoạt động</StatusBadge>;
}

/**
 * Re-sending the set-your-password link. The token only ever travels by email —
 * it is never returned to this screen, so there is nothing here to copy.
 */
function ResendInvite({
  account,
  fullWidth,
}: {
  account: AccountResponse;
  fullWidth?: boolean;
}) {
  const send = useSendPasswordReset(account.id);

  return (
    <Button
      variant="secondary"
      size="sm"
      fullWidth={fullWidth}
      pending={send.isPending}
      onClick={() => send.mutate()}
      aria-label={`Gửi lại liên kết đặt mật khẩu cho ${account.full_name ?? account.email}`}
    >
      {send.isSuccess ? "Đã gửi" : "Gửi lại liên kết"}
    </Button>
  );
}

/**
 * The one action per row. Locking is destructive, so it carries the danger
 * tone; unlocking restores access and stays secondary.
 */
function RowActions({
  account,
  onAsk,
}: {
  account: AccountResponse;
  onAsk: (account: AccountResponse) => void;
}) {
  const locking = account.is_active;
  const name = account.full_name ?? account.email;

  return (
    <span className="flex flex-wrap justify-end gap-2">
      <ResendInvite account={account} />
      <Button
        variant={locking ? "danger" : "secondary"}
        size="sm"
        onClick={() => onAsk(account)}
        aria-label={locking ? `Khóa tài khoản của ${name}` : `Mở lại tài khoản của ${name}`}
      >
        {locking ? "Khóa" : "Mở lại"}
      </Button>
    </span>
  );
}
