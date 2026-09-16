import { NavLink, Outlet } from "react-router";

import { STAFF_NAV, STAFF_NAV_GROUPS } from "~/content/nav";
import { RoleGate } from "~/features/auth/role-gate";
import { useLogout } from "~/features/auth/use-logout";
import { useSession } from "~/features/auth/use-session";
import { cn } from "~/lib/cn";

/**
 * The operational shell. Desktop-first: a studio manager works at 1440 or 1024
 * with the tab open all day. It shares the brand's material — plaster, rule,
 * ink, the serif figure — but none of the public site's editorial pacing.
 */
export default function StaffLayout() {
  return (
    <RoleGate allow={["staff", "owner"]}>
      <div className="bg-chalk min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
        <StaffRail />
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </RoleGate>
  );
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "block py-1.5 text-sm transition-colors",
    isActive
      ? "text-ink border-l-lacquer -ml-3 border-l-2 pl-[calc(0.75rem-2px)]"
      : "text-ink-2 hover:text-ink active:text-ink",
  );

function StaffRail() {
  const { data: user } = useSession();
  const logout = useLogout();

  return (
    <div className="rule-b bg-sand lg:border-rule lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block lg:px-6 lg:py-6">
        <div className="shrink-0">
          <span className="wordmark text-ink text-base">SOUL</span>
          {/* Below lg the rail is a scrolling strip and the nav needs the width;
              the subtitle wrapped to three lines and squeezed the wordmark. */}
          <p className="wordmark-sub text-ink-2 mt-1 hidden lg:block">Vận hành studio</p>
        </div>

        {/* Below lg the rail collapses to a scrolling strip: a studio phone gets
            the same destinations without a drawer to open. */}
        <nav aria-label="Điều hướng studio" className="min-w-0 lg:mt-8">
          <ul className="flex gap-4 overflow-x-auto lg:flex-col lg:gap-0 lg:overflow-visible">
            {STAFF_NAV.map((item) => (
              <li key={item.to} className="lg:rule-b shrink-0 lg:py-1.5">
                <NavLink to={item.to} className={linkClass} end>
                  {item.label}
                </NavLink>
              </li>
            ))}
            {STAFF_NAV_GROUPS.map((group) => (
              <li key={group.label} className="shrink-0 lg:mt-5 lg:block">
                <p className="label-micro hidden lg:mb-1.5 lg:block">{group.label}</p>
                <ul className="flex gap-4 lg:flex-col lg:gap-0">
                  {group.items.map((item) => (
                    <li key={item.to} className="shrink-0 lg:py-1.5">
                      <NavLink to={item.to} className={linkClass}>
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {user ? (
        <div className="hidden px-6 pb-6 lg:mt-auto lg:block">
          <p className="rule-t text-ink-2 pt-4 text-xs">{user.fullName}</p>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="text-ink-2 hover:text-ink active:text-ink decoration-rule-2 hover:decoration-lacquer mt-1 text-xs underline underline-offset-[6px] disabled:cursor-not-allowed"
          >
            Đăng xuất
          </button>
        </div>
      ) : null}
    </div>
  );
}
