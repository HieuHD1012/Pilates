import { Slot } from "@radix-ui/react-slot";
import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "~/lib/cn";

type Variant = "primary" | "copper" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  /** The workhorse. Ink, not brand colour — the app is not a poster. */
  primary:
    "bg-ink text-sand hover:bg-ink-deep active:bg-ink-deep disabled:bg-ink-3 disabled:text-sand",
  /**
   * The brand mark as an action. Reserved for the single dominant call to
   * action on a public page. Never appears beside a status badge (see
   * docs/DESIGN_SYSTEM.md — copper and danger must not share a context).
   */
  copper: "bg-copper text-sand hover:bg-copper-2 active:bg-copper-2 disabled:bg-ink-3",
  secondary:
    "bg-transparent text-ink border border-rule-2 hover:border-ink hover:bg-sand-deep/60 active:bg-sand-deep active:border-ink disabled:text-ink-3 disabled:border-rule",
  ghost:
    "bg-transparent text-ink underline decoration-rule-2 decoration-1 underline-offset-[6px] hover:decoration-copper hover:text-copper active:text-copper-2 active:decoration-copper-2 disabled:text-ink-3 disabled:no-underline",
  danger:
    "bg-transparent text-danger border border-danger/40 hover:bg-danger-wash hover:border-danger active:bg-danger-wash active:border-danger disabled:text-ink-3 disabled:border-rule",
};

const SIZE: Record<Size, string> = {
  sm: "min-h-10 px-3 py-2 text-xs gap-1.5",
  md: "min-h-11 px-4 py-2 text-sm gap-2",
  lg: "min-h-12 px-6 py-3 text-base gap-2.5",
};

const CONTENT_GAP: Record<Size, string> = {
  sm: "gap-1.5",
  md: "gap-2",
  lg: "gap-2.5",
};

const LOADER_SIZE: Record<Size, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-4",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Render as the single child element (e.g. a router <Link>). */
  asChild?: boolean;
  /**
   * Shows a pending affordance and blocks interaction. Both content states are
   * always laid out in the same grid cell, so entering pending never moves the
   * button or its neighbours.
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
  pendingLabel = "Đang xử lý…",
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
        "inline-flex max-w-full shrink-0 items-center justify-center rounded-sm text-center font-medium",
        "ease-measure transition-colors duration-200",
        "disabled:cursor-not-allowed",
        "relative overflow-hidden",
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
        <span className="grid min-w-0">
          <span
            aria-hidden={pending || undefined}
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center justify-center whitespace-nowrap transition-opacity duration-150",
              CONTENT_GAP[size],
              pending ? "invisible opacity-0" : "visible opacity-100",
            )}
          >
            {icon}
            <span>{children}</span>
          </span>
          <span
            aria-hidden={!pending || undefined}
            aria-live={pending ? "polite" : undefined}
            aria-atomic={pending || undefined}
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center justify-center whitespace-nowrap transition-opacity duration-150",
              CONTENT_GAP[size],
              pending ? "visible opacity-100" : "invisible opacity-0",
            )}
          >
            <LoaderCircle
              aria-hidden="true"
              className={cn(
                "shrink-0 animate-spin motion-reduce:animate-none",
                LOADER_SIZE[size],
              )}
            />
            <span>{pendingLabel}</span>
          </span>
        </span>
      )}
    </Component>
  );
}
