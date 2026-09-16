import type { ReactNode } from "react";

import { cn } from "~/lib/cn";

/**
 * A ruled definition list. This existed three times as a local `Row` helper
 * before it existed once here — label column, value column, hairline between.
 * No card: the rules and the shared label column are the grouping.
 */
export function DetailList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={cn("rule-t", className)}>{children}</dl>;
}

export function DetailRow({
  label,
  children,
  labelWidth = "8.5rem",
  className,
}: {
  label: string;
  children: ReactNode;
  /** Widen when labels are long; keep one value per screen. */
  labelWidth?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("rule-b grid items-baseline gap-x-4 gap-y-1 py-3", className)}
      style={{ gridTemplateColumns: `minmax(0, ${labelWidth}) minmax(0, 1fr)` }}
    >
      <dt className="text-ink-2 text-xs">{label}</dt>
      <dd className="text-ink m-0 text-sm">{children}</dd>
    </div>
  );
}
