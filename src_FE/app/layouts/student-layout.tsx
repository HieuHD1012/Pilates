import { NavLink, Outlet } from "react-router";

import { STUDENT_NAV } from "~/content/nav";
import { RoleGate } from "~/features/auth/role-gate";
import { useSession } from "~/features/auth/use-session";
import { cn } from "~/lib/cn";

/**
 * Mobile-first. A student opens this on a phone, usually standing up, usually
 * to answer one question: what am I booked into, and what can I book next.
 * Bottom navigation is used here because those four destinations are switched
 * between constantly — not because bottom bars are fashionable.
 */
export default function StudentLayout() {
  return (
    <RoleGate allow={["student"]}>
      <div className="bg-chalk flex min-h-dvh flex-col">
        <StudentHeader />
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
        <StudentTabBar />
      </div>
    </RoleGate>
  );
}

function StudentHeader() {
  const { data: user } = useSession();

  return (
    <header className="rule-b bg-sand/95 sticky top-0 z-(--z-nav) backdrop-blur-[2px]">
      <div className="gutter mx-auto flex h-14 max-w-(--container-page) items-center justify-between gap-4">
        <span className="wordmark text-ink text-base">SOUL</span>

        <nav aria-label="Điều hướng học viên" className="hidden md:block">
          <ul className="flex items-center gap-6">
            {STUDENT_NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "py-2 text-sm transition-colors",
                      isActive ? "text-ink" : "text-ink-2 hover:text-ink",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {user ? <span className="text-ink-2 text-xs">{user.fullName}</span> : null}
      </div>
    </header>
  );
}

function StudentTabBar() {
  return (
    <nav
      aria-label="Điều hướng học viên (di động)"
      className="border-rule bg-sand fixed inset-x-0 bottom-0 z-(--z-nav) border-t md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4">
        {STUDENT_NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  // 56px tall: comfortably above the 44px minimum touch target.
                  "flex h-14 flex-col items-center justify-center gap-1 border-t-2 text-xs",
                  isActive ? "border-lacquer text-ink" : "text-ink-2 border-transparent",
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
