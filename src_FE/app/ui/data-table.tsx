import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

import { cn } from "~/lib/cn";

/**
 * A ruled table with its own horizontal scroll and a sticky header.
 *
 * The scroll container is the reason this is a component rather than a
 * composition: wide operational data must scroll inside its own box so the page
 * body never scrolls sideways (docs/RESPONSIVE.md). Everything visible is
 * hairlines and type — no zebra striping, no outer border, no card.
 */
export function DataTable({
  children,
  caption,
  minWidth = "48rem",
  className,
}: {
  children: ReactNode;
  /** Read by screen readers; visually hidden. */
  caption: string;
  minWidth?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)} role="region" aria-label={caption} tabIndex={0}>
      <p className="text-ink-2 px-4 py-2 text-xs lg:hidden">Vuốt ngang để xem các cột còn lại.</p>
      <table className="w-full border-collapse text-left" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  numeric = false,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "rule-b text-ink-2 bg-chalk sticky top-0 px-4 py-2.5 text-xs font-medium whitespace-nowrap",
        numeric && "text-right",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  numeric = false,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        "rule-b text-ink px-4 py-3 align-middle text-sm",
        numeric && "text-right",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

/** A row that navigates. Keeps the pressed state the rest of the system has. */
export function Tr({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "[&:last-child>td]:border-b-0",
        props.onClick && "hover:bg-sand/70 active:bg-sand-deep cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}
