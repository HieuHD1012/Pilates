import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { cn } from "~/lib/cn";

/**
 * The secondary path beside a page's one ask (P2): text, an arrow, a 44px
 * target. Copper on the light grounds, amber on the ink field.
 */
export function ArrowLink({
  to,
  children,
  tone = "light",
  className,
}: {
  to: string;
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 text-sm font-medium underline underline-offset-[6px]",
        tone === "light"
          ? "text-copper decoration-rule-2 hover:decoration-copper"
          : "text-amber decoration-amber/40 hover:decoration-amber",
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
    </Link>
  );
}
