import { NavLink, Outlet } from "react-router";

import { TRAINER_NAV } from "~/content/nav";
import { RoleGate } from "~/features/auth/role-gate";
import { useLogout } from "~/features/auth/use-logout";
import { useSession } from "~/features/auth/use-session";
import { cn } from "~/lib/cn";

/**
 * Schedule-first. A trainer opens this between classes to answer one question:
 * what am I teaching next and who is in it. Nothing operational beyond that
 * belongs in this shell.
 */
export default function TrainerLayout() {
  const { data: user } = useSession();
  const logout = useLogout();

  return (
    <RoleGate allow={["TRAINER"]}>
      <div className="bg-chalk flex min-h-dvh flex-col">
        <header className="rule-b bg-sand/95 sticky top-0 z-(--z-nav) backdrop-blur-[2px]">
          <div className="gutter mx-auto flex h-14 max-w-(--container-page) items-center justify-between gap-4">
            <span className="wordmark text-ink text-base">SOUL</span>
            <nav aria-label="Điều hướng huấn luyện viên">
              <ul className="flex items-center gap-5">
                {TRAINER_NAV.map((item) => (
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
            {user ? (
              <button
                type="button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="text-ink-2 hover:text-ink active:text-ink text-xs disabled:cursor-not-allowed"
              >
                Đăng xuất
              </button>
            ) : null}
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </RoleGate>
  );
}
