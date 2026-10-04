import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Ellipsis } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "~/lib/cn";

/**
 * The operational workspace (docs/adr/0006-operational-workspace.md).
 *
 * Staff screens group concurrent work in bordered paper panels on the sand
 * ground. Hairlines still do the work inside a panel; the panel exists so a
 * dozen tasks on one screen read as a dozen units rather than one long ruled
 * column. No shadow: elevation stays reserved for dialog, popover and sheet.
 */

/** The route's content column. Every staff route renders exactly one. */
export function WorkspacePage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-(--container-wide) flex-col gap-5 px-4 py-5 md:gap-6 md:px-8 md:py-7",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Panel({
  children,
  className,
  as: Component = "section",
  tone = "paper",
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
  /** `attention` holds work that is waiting on someone (unconfirmed money). */
  tone?: "paper" | "attention" | "recessed";
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <Component
      className={cn(
        "border-rule min-w-0 rounded-lg border",
        tone === "paper" && "bg-paper",
        tone === "attention" && "border-warning/30 bg-warning-wash/45",
        tone === "recessed" && "bg-chalk",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * A panel's head: what the group is, one line on how to read it, and the
 * actions that act on the whole group at its edge.
 */
export function PanelHeader({
  title,
  description,
  actions,
  headingLevel = 2,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div
      className={cn(
        "rule-b flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5 md:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <Heading className="text-ink text-base font-semibold">{title}</Heading>
        {description ? <p className="text-ink-2 mt-0.5 text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PanelBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("px-4 py-4 md:px-5", className)}>{children}</div>;
}

export function PanelFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rule-t text-ink-2 flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm md:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The bar of filters at the top of the panel it filters: a segmented status
 * filter first, secondary filters and the search after it.
 */
export function Toolbar({
  children,
  trailing,
  className,
}: {
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rule-b flex flex-wrap items-center justify-between gap-3 px-3 py-3 md:px-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">{children}</div>
      {trailing ? (
        <div className="flex flex-wrap items-center gap-2.5">{trailing}</div>
      ) : null}
    </div>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Rows behind this option. Absent when the count is not known. */
  count?: number;
}

/**
 * The primary filter of a list, as a segmented control with counts. It is a
 * group of toggle buttons (`aria-pressed`), not tabs: the rows below are the
 * same list narrowed, not a different panel.
 */
export function SegmentFilter<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "bg-sand-deep/70 inline-flex max-w-full gap-1 overflow-x-auto rounded-md p-1",
        className,
      )}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-sm px-3 text-sm whitespace-nowrap",
              "transition-colors duration-200",
              on
                ? "bg-paper text-ink border-rule border font-medium"
                : "text-ink-2 hover:text-ink border border-transparent",
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cn("figures text-xs", on ? "text-copper" : "text-ink-2")}>
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Initials in a disc. A person's row starts here (ADR 0006, decision 8). */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-sand-deep text-copper-2 inline-grid shrink-0 place-items-center rounded-full font-semibold",
        size === "sm" && "text-2xs size-7",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-12 text-sm",
        size === "xl" && "size-14 text-base",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function initials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "–";
  const last = words[words.length - 1] ?? "";
  const before = words.length > 1 ? (words[words.length - 2] ?? "") : "";
  return `${before.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/**
 * A person as the first cell of a row: avatar, name, and one line under it
 * (usually the phone). `name` may be a link element supplied by the caller.
 */
export function PersonCell({
  name,
  avatarName,
  detail,
  size = "md",
  className,
}: {
  name: ReactNode;
  /** The plain string the initials come from, when `name` is an element. */
  avatarName: string | null | undefined;
  detail?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <Avatar name={avatarName} size={size} />
      <span className="flex min-w-0 flex-col">
        <span className="text-ink truncate text-sm font-medium">{name}</span>
        {detail ? <span className="text-ink-2 truncate text-xs">{detail}</span> : null}
      </span>
    </span>
  );
}

/**
 * A quantity against its whole: remaining sessions, seats booked. Decoration
 * only — the caller always writes the number beside it.
 */
export function Meter({
  value,
  max,
  tone = "neutral",
  className,
}: {
  value: number;
  max: number;
  tone?: "neutral" | "positive" | "attention" | "critical";
  className?: string;
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-sand-deep block h-1.5 w-full overflow-hidden rounded-full",
        className,
      )}
    >
      <span
        className={cn(
          "block h-full rounded-full transition-[width] duration-200",
          tone === "neutral" && "bg-copper-bright",
          tone === "positive" && "bg-success",
          tone === "attention" && "bg-amber",
          tone === "critical" && "bg-danger",
        )}
        style={{ width: `${ratio * 100}%` }}
      />
    </span>
  );
}

/**
 * Figures that describe one period or one object, as one unit
 * (docs/UI_QUALITY.md: relationships before containers). One panel; the
 * figures are separated by hairlines, side by side from sm up and stacked on a
 * phone. Not one card per number, and no icon tiles: the label names it.
 */
export function StatGroup({
  children,
  label,
  className,
}: {
  children: ReactNode;
  /** Accessible name for the group, e.g. "Số liệu tháng này". */
  label?: string;
  className?: string;
}) {
  return (
    <Panel
      as="div"
      role={label ? "group" : undefined}
      aria-label={label}
      className={cn(
        "divide-rule grid grid-cols-1 divide-y sm:auto-cols-fr sm:grid-flow-col sm:divide-x sm:divide-y-0",
        className,
      )}
    >
      {children}
    </Panel>
  );
}

export function Stat({
  label,
  value,
  unit,
  context,
  children,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  /** One quiet line under the figure: what it counts, or a link to the work. */
  context?: ReactNode;
  /** Extra content under the figure, e.g. a Meter. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 px-5 py-4", className)}>
      <span className="text-ink-2 text-sm">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="figures-display text-ink text-3xl leading-tight">{value}</span>
        {unit ? <span className="text-ink-2 text-sm">{unit}</span> : null}
      </span>
      {children}
      {context ? <span className="text-ink-2 text-xs">{context}</span> : null}
    </div>
  );
}

/** A short notice inside a page or panel. Not a warning bar. */
export function InlineNote({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-sand-deep/70 text-ink-2 flex items-start gap-2.5 rounded-md px-3.5 py-3 text-sm",
        "[&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
        className,
      )}
    >
      {icon}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * The overflow menu at a row's edge (ADR 0006, decision 7). Items are plain
 * buttons; a destructive item carries `danger` and, where the consequence is
 * not obvious, a `note` under it.
 */
export function RowMenu({
  label,
  children,
  align = "end",
}: {
  /** Accessible name of the trigger, e.g. "Thao tác cho Lê Bảo Ngọc". */
  label: string;
  children: ReactNode;
  align?: "start" | "end";
}) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "text-ink-2 hover:bg-sand-deep hover:text-ink inline-grid size-11 place-items-center rounded-md sm:size-9",
            "data-[state=open]:bg-sand-deep data-[state=open]:text-ink",
          )}
        >
          <Ellipsis className="size-4" aria-hidden="true" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={6}
          className="bg-paper border-rule shadow-popover z-(--z-dropdown) w-72 rounded-lg border p-1.5"
        >
          <div className="flex flex-col">{children}</div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export function RowMenuItem({
  icon,
  children,
  danger = false,
  note,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  danger?: boolean;
  note?: string;
}) {
  return (
    <>
      <PopoverPrimitive.Close asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm",
            "hover:bg-sand disabled:text-ink-3 disabled:cursor-not-allowed",
            "[&>svg]:size-4 [&>svg]:shrink-0",
            danger ? "text-danger" : "text-ink [&>svg]:text-ink-2",
            className,
          )}
          {...props}
        >
          {icon}
          {children}
        </button>
      </PopoverPrimitive.Close>
      {note ? <p className="text-ink-2 px-2.5 pt-0.5 pb-2 text-xs">{note}</p> : null}
    </>
  );
}

export function RowMenuSeparator() {
  return <hr className="border-rule my-1.5" />;
}
