import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import { HydrateFallback } from "~/root";
import type { Role } from "~/lib/api/types";

import { ROLE_HOME, useSession } from "./use-session";

/**
 * A UX guard, NOT a security boundary.
 *
 * It keeps people out of screens that would be empty or confusing for them.
 * Every protected resource behind these routes is still enforced by the
 * backend; hiding a control here never grants or denies a permission.
 * See docs/DATA_OWNERSHIP.md.
 */
export function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const location = useLocation();
  const { data: user, isPending, isError } = useSession();

  if (isPending) return <HydrateFallback />;

  if (isError || !user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/dang-nhap?next=${next}`} replace />;
  }

  if (!allow.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  return <>{children}</>;
}
