import type { ReactNode } from "react";

import { cn } from "~/lib/cn";

/**
 * The public site is composed of ruled sections, not stacked cards. A section
 * opens on a hairline, carries a numbered sentence-case label, and gives its
 * content the page's shared gutter.
 */
export function Section({
  index,
  label,
  children,
  className,
  tone = "sand",
  id,
}: {
  index?: string;
  label?: string;
  children: ReactNode;
  className?: string;
  tone?: "sand" | "deep" | "ink";
  id?: string;
}) {
  return (
    <section
      id={id}
      data-field={tone === "ink" ? "dark" : undefined}
      className={cn(
        tone === "sand" && "bg-sand text-ink",
        tone === "deep" && "bg-sand-deep text-ink",
        tone === "ink" && "bg-ink-deep text-sand",
        className,
      )}
    >
      <div className="gutter mx-auto max-w-(--container-page)">
        {label ? (
          <div
            className={cn(
              "flex items-baseline gap-4 border-t pt-5 pb-8 md:pb-10",
              tone === "ink" ? "border-rule-dark" : "border-rule",
            )}
          >
            {index ? (
              <span
                className={cn(
                  "figures text-2xs",
                  tone === "ink" ? "text-sand/50" : "text-ink-2",
                )}
              >
                {index}
              </span>
            ) : null}
            <span className={cn("label-micro", tone === "ink" && "text-sand/70")}>
              {label}
            </span>
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

/** A hairline that spans the content column. The system's structural unit. */
export function Rule({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark" | "strong";
  className?: string;
}) {
  return (
    <hr
      className={cn(
        "border-t",
        tone === "light" && "border-rule",
        tone === "strong" && "border-rule-2",
        tone === "dark" && "border-rule-dark",
        className,
      )}
    />
  );
}

/**
 * Operational page header. Title, the one sentence that orients the user, and
 * the actions for this screen. Deliberately small: an admin screen with a
 * 48px headline wastes the row a studio manager actually needs.
 */
export function PageHeader({
  title,
  description,
  actions,
  meta,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("rule-b pb-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-ink text-xl font-medium">{title}</h1>
          {description ? (
            <p className="measure-wide text-ink-2 mt-1 text-sm">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? <div className="mt-3">{meta}</div> : null}
    </header>
  );
}

/**
 * Operational filter row. Filters sit on a rule above the data they filter,
 * never inside a floating card, so the eye reads filter → rule → results.
 */
export function FilterBar({
  children,
  trailing,
  className,
}: {
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end gap-x-3 gap-y-2 py-3", className)}>
      {children}
      {trailing ? <div className="ml-auto flex items-center gap-2">{trailing}</div> : null}
    </div>
  );
}

/**
 * A dashboard metric. The figure is the design; the label is small and the
 * whole thing sits on a rule rather than inside a bordered box.
 */
export function Metric({
  label,
  value,
  unit,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  detail?: string;
  tone?: "neutral" | "attention";
}) {
  return (
    <div className="rule-t flex flex-col gap-1 pt-3">
      <span className="label-micro">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "figures-display text-3xl",
            tone === "attention" ? "text-lacquer" : "text-ink",
          )}
        >
          {value}
        </span>
        {unit ? <span className="text-ink-2 text-xs">{unit}</span> : null}
      </span>
      {detail ? <span className="text-ink-2 text-xs">{detail}</span> : null}
    </div>
  );
}
