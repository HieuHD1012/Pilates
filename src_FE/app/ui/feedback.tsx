import type { ReactNode } from "react";

import { cn } from "~/lib/cn";

/**
 * Skeletons mirror the shape of the content they replace — a ruled row stays a
 * ruled row. A full-page spinner is reserved for boot/auth only.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-rule/70 animate-skeleton block motion-reduce:animate-none",
        className,
      )}
    />
  );
}

export function SkeletonRows({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("rule-t", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rule-b flex items-center gap-4 py-4">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 max-w-56 flex-1" />
          <Skeleton className="ml-auto h-3 w-16" />
        </div>
      ))}
      <span className="sr-only">Đang tải dữ liệu</span>
    </div>
  );
}

/**
 * An empty state has to answer three questions: what is empty, whether that is
 * expected, and what to do next. If it cannot answer the third, it should not
 * render an action.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    /**
     * Left-aligned on purpose. Every other row in this system starts at the same
     * left edge, and a centred block floating in 100px of nothing is the one
     * layout the rest of the app never uses — it reads as a different product.
     * An empty state is a row that happens to have no rows in it.
     */
    <div className={cn("rule-t py-10", className)}>
      <p className="text-ink text-base">{title}</p>
      <p className="measure text-ink-2 mt-1.5 text-sm">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/**
 * Error copy is contextual and never shows the backend's own words to a
 * student. Staff surfaces may pass `detail` for triage.
 */
export function ErrorState({
  title = "Không tải được dữ liệu",
  description,
  detail,
  onRetry,
  className,
}: {
  title?: string;
  description: string;
  detail?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("rule-t border-t-danger/40 py-10", className)} role="alert">
      <p className="text-ink text-base">{title}</p>
      <p className="measure text-ink-2 mt-1.5 text-sm">{description}</p>
      {detail ? (
        <p className="measure text-ink-2 mt-2 font-mono text-xs">{detail}</p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-ink decoration-rule-2 hover:text-lacquer hover:decoration-lacquer mt-5 text-sm underline underline-offset-[6px]"
        >
          Thử lại
        </button>
      ) : null}
    </div>
  );
}

/**
 * A single polite live region per screen. Mutations announce their outcome
 * here instead of relying on a floating toast the user may never see.
 */
export function LiveRegion({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}

/**
 * Shown while a query refetches in the background. The existing data stays on
 * screen — a studio tab that blanks every 30 seconds is unusable.
 */
export function RefreshingRule({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-rule block h-px w-full origin-left transition-opacity duration-200",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      <span className="bg-lacquer block h-px w-1/3 animate-[rule-draw_1200ms_var(--ease-measure)_infinite] motion-reduce:animate-none" />
    </span>
  );
}
