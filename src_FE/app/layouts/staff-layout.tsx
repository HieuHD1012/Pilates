import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import {
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  RefreshCw,
  Users,
  UserRoundCheck,
} from "lucide-react";
import { STAFF_NAV, STAFF_NAV_GROUPS, type NavItem } from "~/content/nav";
import { RoleGate } from "~/features/auth/role-gate";
import { useLogout } from "~/features/auth/use-logout";
import { useSession } from "~/features/auth/use-session";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/button";
import { Dialog, DialogContent } from "~/ui/dialog";
import { Avatar } from "~/ui/workspace";

const ICONS = [
  LayoutDashboard,
  CalendarDays,
  CircleUserRound,
  Users,
  UserRoundCheck,
  Layers3,
  CreditCard,
  NotebookPen,
  RefreshCw,
  ChartNoAxesCombined,
  CircleUserRound,
];
const destinations = [...STAFF_NAV, ...STAFF_NAV_GROUPS.flatMap((group) => group.items)];

export default function StaffLayout() {
  const { data: user } = useSession();
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const current = destinations.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
  const visible = (item: NavItem) =>
    !item.roles || (user != null && item.roles.includes(user.role));
  const nav = (mobile = false) => (
    <nav aria-label={mobile ? "Điều hướng studio trên điện thoại" : "Điều hướng studio"}>
      {[{ label: "", items: STAFF_NAV }, ...STAFF_NAV_GROUPS].map((group) => (
        <div key={group.label} className="mb-6 last:mb-0">
          {group.label ? (
            <p className="text-ink-2 mb-2 px-3 text-xs font-medium">{group.label}</p>
          ) : null}
          <ul className="space-y-1">
            {group.items.filter(visible).map((item) => {
              const Icon = ICONS[destinations.indexOf(item)] ?? CircleUserRound;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/studio/tong-quan"}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                        isActive
                          ? "bg-sand-deep text-copper font-medium"
                          : "text-ink-2 hover:bg-sand-deep/60 hover:text-ink",
                      )
                    }
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <RoleGate allow={["ADMIN", "STAFF"]}>
      <div className="bg-chalk min-h-dvh lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <aside className="bg-sand border-rule hidden h-dvh flex-col border-r lg:sticky lg:top-0 lg:flex">
          <Link to="/studio/tong-quan" className="block px-7 py-7">
            <span className="wordmark text-ink text-xl">SOUL</span>
            <span className="text-ink-2 mt-2 block text-xs">Không gian vận hành</span>
          </Link>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{nav()}</div>
          <div className="border-rule border-t p-4">
            <Link
              to="/"
              className="text-ink-2 hover:text-copper flex min-h-11 items-center justify-between gap-3 px-3 text-sm"
            >
              Website studio
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </aside>
        <div className="min-w-0">
          <header className="bg-paper border-rule flex min-h-18 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                className="lg:hidden"
                aria-label="Menu studio"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
              <p className="text-ink-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="hidden sm:inline">Studio</span>
                <ChevronRight className="hidden size-3 sm:block" aria-hidden="true" />
                <span className="text-ink">{current?.label ?? "Quản lý"}</span>
              </p>
            </div>
            {user ? (
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={user.full_name} />
                <div className="hidden min-w-0 sm:block">
                  <p className="text-ink max-w-52 text-sm wrap-anywhere">
                    {user.full_name}
                  </p>
                  <p className="text-ink-2 text-xs">
                    {user.role === "ADMIN" ? "Quản trị viên" : "Nhân viên studio"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  aria-label="Đăng xuất"
                  pending={logout.isPending}
                  onClick={() => logout.mutate()}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </header>
          <main className="admin-workspace min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent title="Điều hướng studio">
          {nav(true)}
          <Link to="/" className="text-copper inline-flex min-h-11 items-center text-sm">
            Về website studio
          </Link>
        </DialogContent>
      </Dialog>
    </RoleGate>
  );
}
