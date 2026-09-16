import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "~/lib/cn";

type Variant = "primary" | "lacquer" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  /** The workhorse. Ink, not brand colour — the app is not a poster. */
  primary:
    "bg-ink text-sand hover:bg-ink-deep active:bg-ink-deep disabled:bg-ink-3 disabled:text-sand",
  /**
   * The brand mark as an action. Reserved for the single dominant call to
   * action on a public page. Never appears beside a status badge (see
   * docs/DESIGN_SYSTEM.md — lacquer and danger must not share a context).
   */
  lacquer: "bg-lacquer text-sand hover:bg-lacquer-2 active:bg-lacquer-2 disabled:bg-ink-3",
  secondary:
    "bg-transparent text-ink border border-rule-2 hover:border-ink hover:bg-sand-deep/60 active:bg-sand-deep active:border-ink disabled:text-ink-3 disabled:border-rule",
  ghost:
    "bg-transparent text-ink underline decoration-rule-2 decoration-1 underline-offset-[6px] hover:decoration-lacquer hover:text-lacquer active:text-lacquer-2 active:decoration-lacquer-2 disabled:text-ink-3 disabled:no-underline",
  danger:
    "bg-transparent text-danger border border-danger/40 hover:bg-danger-wash hover:border-danger active:bg-danger-wash active:border-danger disabled:text-ink-3 disabled:border-rule",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Render as the single child element (e.g. a router <Link>). */
  asChild?: boolean;
  /**
   * Shows a pending affordance and blocks interaction. The label stays in
   * place — a button that swaps its text mid-mutation loses the user's place.
   */
  pending?: boolean;
  pendingLabel?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  asChild = false,
  pending = false,
  pendingLabel = "Đang xử lý",
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      {...(asChild ? {} : { type, disabled: disabled || pending })}
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm font-medium",
        "ease-measure transition-colors duration-200",
        "disabled:cursor-not-allowed",
        // The pending mark is a hairline that fills, not a spinner.
        "relative overflow-hidden",
        "data-[pending]:after:absolute data-[pending]:after:inset-x-0 data-[pending]:after:bottom-0",
        "data-[pending]:after:h-px data-[pending]:after:bg-current data-[pending]:after:opacity-40",
        "data-[pending]:after:animate-[rule-draw_900ms_var(--ease-measure)_infinite]",
        VARIANT[variant],
        SIZE[size],
        fullWidth && "w-full",
        className,
      )}
      {...(asChild ? props : props)}
    >
      {asChild ? (
        children
      ) : (
        <>
          {icon}
          <span>{children}</span>
          {pending ? <span className="sr-only">{pendingLabel}</span> : null}
        </>
      )}
    </Component>
  );
}
