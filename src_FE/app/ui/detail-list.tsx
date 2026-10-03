import type { ReactNode } from "react";

import { cn } from "~/lib/cn";

/**
 * A record, not a comparison table. Each label stays immediately above its
 * value; at wider widths independent facts can share a grid in the caller.
 */
export function DetailList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={cn("rule-t grid gap-x-8 sm:grid-cols-2", className)}>{children}</dl>;
}

export function DetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  /** Kept for callers migrating from the former two-column record. */
  labelWidth?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("rule-b min-w-0 py-3", className)}
    >
      <dt className="text-ink-2 text-sm">{label}</dt>
      <dd className="text-ink mt-1 text-sm wrap-anywhere">{children}</dd>
    </div>
  );
}
