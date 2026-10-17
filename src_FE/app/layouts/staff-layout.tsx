import {
  BookOpen,
  CalendarDays,
  ChartColumn,
  CreditCard,
  House,
  Inbox,
  LogOut,
  Menu,
  Megaphone,
  Package,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useId, useState } from "react";
import { NavLink, Outlet } from "react-router";

import { STAFF_NAV, STAFF_NAV_GROUPS, type NavItem } from "~/content/nav";
import { RoleGate } from "~/features/auth/role-gate";
import { useLogout } from "~/features/auth/use-logout";
import { useSession } from "~/features/auth/use-session";
import { useLeads } from "~/features/leads/queries";
import { useDashboard } from "~/features/reports/queries";
import type { Role } from "~/lib/api/schema";
import { cn } from "~/lib/cn";
import { DemoDataNotice } from "~/ui/demo-data-notice";
import { Dialog, DialogContent } from "~/ui/dialog";
import { Avatar } from "~/ui/workspace";

/**
 * The operational shell (docs/adr/0006-operational-workspace.md, as amended by
 * docs/UI_QUALITY.md). Desktop-first: a studio manager works at 1440 or 1024
 * with the tab open all day, so the shell recedes and the work advances — a
 * light rail on linen, ink-2 labels, the open page on paper with a copper
 * stroke, and neutral counts on the three queues that hold waiting work. The
 * sample-data tag lives here, once, because every screen behind it reads the
 * same source. Below lg the rail becomes a slim top bar whose menu opens the
 * same groups in a dialog.
 */
export default function StaffLayout() {
  return (
    <RoleGate allow={["ADMIN", "STAFF"]}>
      <div className="bg-sand min-h-dvh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <StaffRail />
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </RoleGate>
  );
}

const ICON: Record<string, LucideIcon> = {
  "/studio/tong-quan": House,
  "/studio/lich": CalendarDays,
  "/studio/khach-quan-tam": Inbox,
  "/studio/hoc-vien": Users,
  "/studio/huan-luyen-vien": UserRoundCheck,
  "/studio/goi-tap": Package,
  "/studio/thanh-toan": CreditCard,
  "/studio/so-buoi": BookOpen,
  "/studio/gia-han": RefreshCw,
  "/studio/bao-cao": ChartColumn,
  "/studio/tai-khoan": ShieldCheck,
  "/studio/thong-bao": Megaphone,
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Quản trị",
  STAFF: "Nhân viên",
  TRAINER: "Huấn luyện viên",
  STUDENT: "Học viên",
};

/**
 * Waiting work per destination. Every number is one the backend already
 * returns — the dashboard's `renewals_due` and `unconfirmed_payments`, and the
 * length of the new-lead list — so the rail never counts something itself.
 */
function useQueueCounts(): Record<string, number> {
  const dashboard = useDashboard();
  const newLeads = useLeads({ status: "NEW" });
  const counts: Record<string, number> = {};
  for (const number of dashboard.data?.numbers ?? []) {
    if (number.value === null) continue;
    // The backend names it `renewals_needing_contact`; the fixtures, `renewals_due`.
    if (number.key === "renewals_due" || number.key === "renewals_needing_contact")
      counts["/studio/gia-han"] = number.value;
    if (number.key === "unconfirmed_payments") counts["/studio/thanh-toan"] = number.value;
  }
  if (newLeads.data) counts["/studio/khach-quan-tam"] = newLeads.data.length;
  return counts;
}

function StaffRail() {
  const { data: user } = useSession();
  const logout = useLogout();
  const counts = useQueueCounts();
  const [menuOpen, setMenuOpen] = useState(false);

  // An entry with no `roles` is for everyone this layout admits.
  const visible = (item: NavItem) =>
    item.roles === undefined ||
    (user !== undefined && user !== null && item.roles.includes(user.role));

  const groups = [
    { label: null, items: STAFF_NAV.filter(visible) },
    ...STAFF_NAV_GROUPS.map((group) => ({
      label: group.label,
      items: group.items.filter(visible),
    })),
  ];

  const nav = (onNavigate?: () => void) => (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.label ?? "home"}>
          {group.label ? (
            <p className="text-ink-2 mb-1 px-3 text-xs">{group.label}</p>
          ) : null}
          <ul className="flex flex-col gap-px">
            {group.items.map((item) => (
              <li key={item.to}>
                <RailLink item={item} count={counts[item.to]} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  const userBlock = user ? (
    <UserBlock
      name={user.full_name}
      role={ROLE_LABEL[user.role]}
      pending={logout.isPending}
      onLogout={() => logout.mutate()}
    />
  ) : null;

  return (
    <>
      {/* Below lg: a slim bar. The menu opens every group, and logout. */}
      <div className="bg-sand border-rule sticky top-0 z-(--z-nav) flex h-14 items-center gap-3 border-b px-3 lg:hidden">
        <button
          type="button"
          aria-label="Menu studio"
          onClick={() => setMenuOpen(true)}
          className="text-ink hover:bg-sand-deep grid size-11 place-items-center rounded-md"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <StudioMark />
        <DemoDataNotice compact className="ml-auto" />
      </div>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent title="Điều hướng studio">
          <nav aria-label="Điều hướng studio trên điện thoại">
            {nav(() => setMenuOpen(false))}
          </nav>
          {userBlock ? <div className="rule-t mt-5 pt-4">{userBlock}</div> : null}
        </DialogContent>
      </Dialog>

      <aside className="bg-sand-deep/55 border-rule hidden border-r lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:px-3 lg:pt-5 lg:pb-3">
        <div className="flex flex-col gap-3 px-3 pb-5">
          <StudioMark subtitle />
          <DemoDataNotice compact className="self-start" />
        </div>
        <nav aria-label="Điều hướng studio" className="min-h-0 flex-1 overflow-y-auto">
          {nav()}
        </nav>
        {userBlock ? (
          <div className="border-rule border-t px-1 pt-3">{userBlock}</div>
        ) : null}
      </aside>
    </>
  );
}

function StudioMark({ subtitle = false }: { subtitle?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="bg-copper text-sand font-display grid size-8 shrink-0 place-items-center rounded-md text-base"
      >
        J
      </span>
      <span className="flex flex-col">
        <span className="wordmark text-ink text-base">J PILATES</span>
        {subtitle ? (
          <span className="text-ink-2 mt-1 text-xs">Nha Trang · Vận hành</span>
        ) : null}
      </span>
    </div>
  );
}

function RailLink({
  item,
  count,
  onNavigate,
}: {
  item: NavItem;
  count: number | undefined;
  onNavigate?: () => void;
}) {
  const Icon = ICON[item.to];
  const countId = useId();
  const showCount = count !== undefined && count > 0;

  return (
    <NavLink
      to={item.to}
      end={item.to === "/studio/tong-quan"}
      onClick={onNavigate}
      aria-describedby={showCount ? countId : undefined}
      className={({ isActive }) =>
        cn(
          "relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors lg:min-h-9",
          isActive
            ? // The open page sits on paper; the 3px copper bar is its only colour.
              "bg-paper text-ink before:bg-copper font-medium before:absolute before:inset-y-2 before:left-0 before:w-0.75 before:rounded-full"
            : "text-ink-2 hover:bg-paper/60 hover:text-ink",
        )
      }
    >
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {showCount ? (
        <>
          {/* A neutral figure: the count is information, not an alarm. */}
          <span aria-hidden="true" className="figures text-ink text-xs">
            {count}
          </span>
          {/* `hidden`, not sr-only: text inside the link would join its name
              ("Thanh toán 1 việc đang chờ"); a hidden description is still
              read through aria-describedby. */}
          <span id={countId} hidden>
            {count} việc đang chờ
          </span>
        </>
      ) : null}
    </NavLink>
  );
}

function UserBlock({
  name,
  role,
  pending,
  onLogout,
}: {
  name: string | null;
  role: string;
  pending: boolean;
  onLogout: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} size="sm" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-ink truncate text-sm font-medium">
          {name ?? "Tài khoản studio"}
        </span>
        <span className="text-ink-2 text-xs">{role}</span>
      </span>
      <button
        type="button"
        onClick={onLogout}
        disabled={pending}
        aria-label="Đăng xuất"
        title="Đăng xuất"
        className="text-ink-2 hover:bg-paper hover:text-ink grid size-11 place-items-center rounded-md disabled:cursor-not-allowed lg:size-9"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
