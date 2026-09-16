import type { ReactNode } from "react";

import { cn } from "~/lib/cn";

/**
 * Every aligned or comparable number in this product is rendered through
 * <Figures>. See app/styles/app.css — the UI sans has no tabular figures, so
 * numerals are set in the display serif with `tnum` and optical sizing.
 * Using a bare number in a table or metric is a design-system violation.
 */
export function Figures({
  children,
  display = false,
  className,
}: {
  children: ReactNode;
  display?: boolean;
  className?: string;
}) {
  return (
    <span className={cn(display ? "figures-display" : "figures", className)}>
      {children}
    </span>
  );
}
