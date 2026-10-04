import { AccountEdit } from "~/features/people/account-edit";
import {
  CalendarDays,
  Eye,
  Lock,
  LockOpen,
  Send,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";

import { RoleGate } from "~/features/auth/role-gate";
import { AccountForm } from "~/features/people/account-form";
import {
  useAccounts,
  useCreateAccount,
  useSendPasswordReset,
  useSetAccountLocked,
} from "~/features/people/queries";
import type { AccountResponse, Role } from "~/lib/api/schema";
import { cn } from "~/lib/cn";
import { formatDate, formatPhone, formatTime } from "~/lib/format";
import { Absent } from "~/ui/absent";
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
import {
  InlineNote,
  Panel,
  PanelFooter,
  PersonCell,
  RowMenu,
  RowMenuItem,
  RowMenuSeparator,
  SegmentFilter,
  Toolbar,
  WorkspacePage,
} from "~/ui/workspace";

import { PageControls } from "~/ui/page-controls";

import type { Route } from "./+types/accounts";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tài khoản — J Pilates" }, { name: "robots", content: "noindex" }];
}

/**
 * Login accounts and access.
 *
 * The winning subject is the person who signs in; role, status and creation
 * date are attributes of that person. A row shows a button only when it needs
 * handling — an invitation nobody has answered, an account that is locked — and
 * everything else waits in the row's overflow menu (ADR 0006, decision 7).
 *
 * Locking is an authorization change, so it follows Reference C to the letter:
 * the consequence is stated before the action (in the menu, then again in the
 * dialog naming the person), nothing is applied optimistically, the button keeps
 * its label while pending, and the backend's own error text never reaches the
 * screen. The result then replaces the action — the row's badge and its button
 * both flip once the backend has confirmed.
 *
 * No copper on this screen on purpose: a locked account renders a `danger`
 * badge, and copper must never share a context with danger
 * (docs/DESIGN_SYSTEM.md). The role tags use the neutral and info washes for
 * the same reason.
 */

const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Học viên",
  TRAINER: "Huấn luyện viên",
  STAFF: "Nhân viên",
  ADMIN: "Quản trị",
};

/** Highest access first, the order the role strip reads in. */
const ROLE_ORDER: Role[] = ["ADMIN", "STAFF", "TRAINER", "STUDENT"];

/** One line per role, shortened from the account form's own explanation. */
const ROLE_REACH: Record<Role, string> = {
  ADMIN: "Vận hành, cộng quản lý tài khoản",
  STAFF: "Toàn bộ phần vận hành studio",
  TRAINER: "Lịch dạy và điểm danh lớp mình",
  STUDENT: "Đặt và hủy buổi của mình",
};

const ROLE_TINT: Record<Role, string> = {
  ADMIN: "bg-ink text-sand",
  STAFF: "bg-info-wash text-info",
  TRAINER: "bg-sand-deep text-ink",
  STUDENT: "border-rule-2 text-ink-2 border",
};

const ROLE_ICON: Record<Role, ReactNode> = {
  ADMIN: <ShieldCheck aria-hidden="true" />,
  STAFF: <Users aria-hidden="true" />,
  TRAINER: <UserRound aria-hidden="true" />,
  STUDENT: <CalendarDays aria-hidden="true" />,
};

type Access = "all" | "active" | "pending" | "locked";

/**
 * The filter's buckets. `is_active` (locked by the studio) wins over `status`
 * (password not yet set) here only to give every account one bucket; the row
 * itself still renders both facts — see AccountStatus.
 */
function accessOf(account: AccountResponse): Exclude<Access, "all"> {
  if (!account.is_active) return "locked";
  if (account.status === "PENDING_ACTIVATION") return "pending";
  return "active";
}

type Result = { fullName: string; locked: boolean };

/**
 * ADMIN only, and gated here rather than only in the rail: the whole of
 * `/accounts` is ADMIN on the backend, so a STAFF account that bookmarked this
 * URL would otherwise land on a screen whose every request answers 403.
 * Gating it also means `useAccounts` never fires for them.
 */
export default function StaffAccounts() {
  return (
    <RoleGate allow={["ADMIN"]}>
      <AccountsScreen />
    </RoleGate>
  );
}

function AccountsScreen() {
  const [offset, setOffset] = useState(0);
  const query = useAccounts({ limit: 200, offset });
  const create = useCreateAccount();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [access, setAccess] = useState<Access>("all");
  const [announcement, setAnnouncement] = useState<string | null>(null);

  /** The account awaiting confirmation — also the dialog's open state. */
  const [target, setTarget] = useState<AccountResponse | null>(null);
  /** The last confirmed outcome, kept so the screen states what it did. */
  const [result, setResult] = useState<Result | null>(null);

  // The lock mutation belongs to the account being confirmed, so it is created
  // for that id rather than taking one as an argument.
  const setLocked = useSetAccountLocked(target?.id ?? 0);

  const accounts = query.data ?? [];
  const counts = {
    all: accounts.length,
    active: accounts.filter((account) => accessOf(account) === "active").length,
    pending: accounts.filter((account) => accessOf(account) === "pending").length,
    locked: accounts.filter((account) => accessOf(account) === "locked").length,
  };

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
    <WorkspacePage>
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

      {/* Invitations sent from a row menu: the menu closes on click, so the
          outcome is announced here as well as written beside the row. */}
      <LiveRegion message={announcement} />

      <PageHeader
        title="Tài khoản"
        description="Những người đăng nhập được vào hệ thống của studio, với vai trò và quyền truy cập của từng người."
        actions={
          <Button
            className="max-md:min-h-11"
            icon={<UserPlus className="size-4" aria-hidden="true" />}
            onClick={() => setCreating(true)}
          >
            Tạo tài khoản
          </Button>
        }
      />

      {/* Who holds which role, counted from the list already on screen. */}
      {query.data ? (
        <ul
          aria-label="Số tài khoản theo vai trò trong trang này"
          className="grid grid-cols-2 gap-3 xl:grid-cols-4"
        >
          {ROLE_ORDER.map((role) => (
            <li key={role}>
              <Panel as="div" className="flex h-full items-center gap-3 px-4 py-3.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "hidden size-9 shrink-0 place-items-center rounded-md sm:grid [&_svg]:size-4",
                    ROLE_TINT[role],
                  )}
                >
                  {ROLE_ICON[role]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-ink block text-sm font-medium">
                    {ROLE_LABEL[role]}
                  </span>
                  <span className="text-ink-2 hidden text-xs sm:block">
                    {ROLE_REACH[role]}
                  </span>
                </span>
                <span className="text-2xl leading-none">
                  <Figures className="text-ink">
                    {accounts.filter((account) => account.role === role).length}
                  </Figures>
                </span>
                <PageControls
                  offset={offset}
                  limit={200}
                  count={accounts.length}
                  pending={query.isFetching}
                  onChange={setOffset}
                />
              </Panel>
            </li>
          ))}
        </ul>
      ) : null}

      {result ? (
        <InlineNote
          icon={
            result.locked ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />
          }
        >
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
        </InlineNote>
      ) : null}

      <Panel>
        <Toolbar trailing={<DemoDataNotice />}>
          <SegmentFilter<Access>
            label="Lọc theo quyền truy cập"
            value={access}
            onChange={setAccess}
            options={[
              { value: "all", label: "Tất cả", count: query.data ? counts.all : undefined },
              {
                value: "active",
                label: "Đang hoạt động",
                count: query.data ? counts.active : undefined,
              },
              {
                value: "pending",
                label: "Chưa đặt mật khẩu",
                count: query.data ? counts.pending : undefined,
              },
              {
                value: "locked",
                label: "Đã khóa",
                count: query.data ? counts.locked : undefined,
              },
            ]}
          />
        </Toolbar>

        <QueryBoundary
          query={query}
          skeletonRows={6}
          emptyTitle="Chưa có tài khoản nào"
          emptyDescription="Danh sách tài khoản sẽ xuất hiện ở đây khi hệ thống ghi nhận người đăng nhập đầu tiên."
          errorDescription="Không tải được danh sách tài khoản."
          showErrorDetail
        >
          {(items) => {
            const shown =
              access === "all"
                ? items
                : items.filter((account) => accessOf(account) === access);

            if (shown.length === 0) {
              return (
                <p className="text-ink-2 px-4 py-8 text-sm md:px-5">
                  Không có tài khoản nào ở mục này.
                </p>
              );
            }

            return (
              <>
                {/* From lg up: the columns staff scan down, then the row's
                    one action and its menu at the edge. */}
                <div className="hidden lg:block">
                  <DataTable caption="Tài khoản đăng nhập của studio" minWidth="56rem">
                    <thead>
                      <tr>
                        <Th>Người dùng</Th>
                        <Th>Điện thoại</Th>
                        <Th>Vai trò</Th>
                        <Th>Truy cập</Th>
                        <Th numeric>Tạo lúc</Th>
                        <Th>
                          <span className="sr-only">Thao tác</span>
                        </Th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((account) => (
                        <Tr
                          key={account.id}
                          className={cn(accessOf(account) !== "active" && "bg-sand/60")}
                        >
                          <Td>
                            <AccountPerson account={account} />
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
                          <Td>
                            <RoleTag role={account.role} />
                          </Td>
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
                            <RowActions
                              account={account}
                              onAsk={ask}
                              onAnnounce={setAnnouncement}
                            />
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>

                {/* Below lg the table becomes ruled rows: the same facts, the
                    same one action and menu, no sideways scroll
                    (docs/RESPONSIVE.md). */}
                <ul className="lg:hidden">
                  {shown.map((account) => (
                    <li
                      key={account.id}
                      className="rule-b relative py-4 pr-12 pl-4 last:border-b-0"
                    >
                      <AccountPerson account={account} />

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <RoleTag role={account.role} />
                        <AccountStatus account={account} />
                      </div>

                      <p className="text-ink-2 mt-2 text-xs">
                        {account.phone ? (
                          <>
                            <Figures className="text-ink">
                              {formatPhone(account.phone)}
                            </Figures>
                            <span className="mx-1.5" aria-hidden="true">
                              ·
                            </span>
                          </>
                        ) : null}
                        Tạo lúc{" "}
                        <Figures className="text-ink">
                          {formatDate(account.created_at)}
                        </Figures>
                      </p>

                      <RowActions
                        account={account}
                        onAsk={ask}
                        onAnnounce={setAnnouncement}
                        stacked
                      />
                    </li>
                  ))}
                </ul>
              </>
            );
          }}
        </QueryBoundary>

        <PanelFooter>
          <span>
            <Figures className="text-ink">{accounts.length}</Figures> tài khoản trong trang
            này
          </span>
          <span className="measure-wide text-xs">
            Khóa tài khoản thu hồi luôn mọi phiên đang mở, không chỉ chặn lần đăng nhập sau.
            Studio không đặt mật khẩu thay ai — “Gửi lại liên kết” để người đó tự đặt.
          </span>
        </PanelFooter>
      </Panel>

      <Dialog open={target !== null} onOpenChange={(open) => (open ? null : close())}>
        {target ? (
          <DialogContent
            busy={setLocked.isPending}
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
          busy={create.isPending}
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
    </WorkspacePage>
  );
}

/** The person first (ADR 0006, decision 8): initials, name, and the login. */
function AccountPerson({ account }: { account: AccountResponse }) {
  return (
    <PersonCell
      avatarName={account.full_name ?? account.email}
      name={account.full_name ?? <Absent>Chưa ghi tên</Absent>}
      detail={<span className="break-all">{account.email}</span>}
    />
  );
}

function RoleTag({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        ROLE_TINT[role],
      )}
    >
      {ROLE_LABEL[role]}
    </span>
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
 * The row's edge. Only a row that needs handling shows a button: a locked
 * account offers to reopen it, an unanswered invitation offers to send it
 * again. Locking — destructive, and confirmed in a dialog — and re-sending a
 * link to someone who already has a password live in the menu, the lock with
 * its consequence written under it.
 *
 * Re-sending the set-your-password link: the token only ever travels by email —
 * it is never returned to this screen, so there is nothing here to copy.
 */
function RowActions({
  account,
  onAsk,
  onAnnounce,
  stacked = false,
}: {
  account: AccountResponse;
  onAsk: (account: AccountResponse) => void;
  onAnnounce: (message: string) => void;
  stacked?: boolean;
}) {
  const send = useSendPasswordReset(account.id);
  const navigate = useNavigate();
  const name = account.full_name ?? account.email;
  const locked = !account.is_active;
  const pending = account.is_active && account.status === "PENDING_ACTIVATION";

  function resend() {
    send.mutate(undefined, {
      onSuccess: () => onAnnounce(`Đã gửi liên kết đặt mật khẩu cho ${name}.`),
      onError: () => onAnnounce(`Chưa gửi được liên kết cho ${name}.`),
    });
  }

  const profile =
    account.trainer_id != null
      ? {
          to: `/studio/huan-luyen-vien/${account.trainer_id}`,
          label: "Xem hồ sơ huấn luyện viên",
        }
      : account.student_id != null
        ? { to: `/studio/hoc-vien/${account.student_id}`, label: "Xem hồ sơ học viên" }
        : null;

  const button = locked ? (
    <Button
      variant="secondary"
      size="sm"
      className="max-lg:min-h-11"
      icon={<LockOpen className="size-4" aria-hidden="true" />}
      onClick={() => onAsk(account)}
      aria-label={`Mở lại tài khoản của ${name}`}
    >
      Mở lại
    </Button>
  ) : pending ? (
    <Button
      variant="secondary"
      size="sm"
      className="max-lg:min-h-11"
      icon={<Send className="size-4" aria-hidden="true" />}
      pending={send.isPending}
      onClick={resend}
      aria-label={`Gửi lại liên kết đặt mật khẩu cho ${name}`}
    >
      {send.isSuccess ? "Đã gửi" : "Gửi lại liên kết"}
    </Button>
  ) : null;

  const menu = (
    <RowMenu label={`Thao tác cho ${name}`}>
      {profile ? (
        <RowMenuItem
          icon={<Eye aria-hidden="true" />}
          onClick={() => void navigate(profile.to)}
        >
          {profile.label}
        </RowMenuItem>
      ) : null}
      {pending ? null : (
        <RowMenuItem
          icon={<Send aria-hidden="true" />}
          disabled={send.isPending}
          onClick={resend}
        >
          Gửi liên kết đặt lại mật khẩu
        </RowMenuItem>
      )}
      {locked ? null : (
        <>
          {profile || !pending ? <RowMenuSeparator /> : null}
          <RowMenuItem
            danger
            icon={<Lock aria-hidden="true" />}
            onClick={() => onAsk(account)}
            note="Người này không đăng nhập được nữa và mọi phiên đang mở bị thu hồi. Lớp đã đặt và dữ liệu vẫn giữ nguyên."
          >
            Khóa tài khoản
          </RowMenuItem>
        </>
      )}
    </RowMenu>
  );

  // The menu closes on click, so a menu-sent link reports back beside the row.
  const feedback =
    send.isSuccess && !pending ? (
      <p className="text-success text-xs">Đã gửi liên kết.</p>
    ) : send.isError ? (
      <p role="alert" className="text-danger text-xs">
        Chưa gửi được liên kết. Vui lòng thử lại.
      </p>
    ) : null;

  if (stacked) {
    // On a phone the menu sits in the card's corner (the card is `relative`),
    // so a row with nothing to handle spends no line on it.
    return (
      <>
        <span className="absolute top-3 right-2">{menu}</span>
        <div className="mt-3">
          <AccountEdit accountId={account.id} />
        </div>
        {button ? <div className="mt-3">{button}</div> : null}
        {feedback ? <div className="mt-2">{feedback}</div> : null}
      </>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center justify-end gap-1.5">
        {button}
        {menu}
        <AccountEdit accountId={account.id} />
      </div>
      {feedback}
    </div>
  );
}
