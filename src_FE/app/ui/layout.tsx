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
        // A tonal field starts its own rhythm: the label hairline needs air
        // above it, or it reads as the edge of the colour change.
        tone === "deep" && "bg-sand-deep text-ink pt-20 md:pt-28",
        tone === "ink" && "bg-ink text-sand pt-20 md:pt-28",
        className,
      )}
    >
      <div className="gutter mx-auto max-w-(--container-page)">
        {label ? (
          <div className="relative flex items-baseline gap-4 pt-5 pb-12 md:pb-16">
            {/* The section hairline is its own element so it can draw itself in
                on the narrative pages (data-reveal; app/features/public/motion.tsx).
                Everywhere else it is simply there. */}
            <span
              aria-hidden="true"
              data-reveal="rule"
              className={cn(
                "absolute inset-x-0 top-0 h-px",
                tone === "ink" && "bg-rule-dark",
                tone === "deep" && "bg-rule-2",
                tone === "sand" && "bg-rule",
              )}
            />
            {index ? (
              <span
                className={cn(
                  "figures text-sm",
                  tone === "ink" ? "text-amber" : "text-copper",
                )}
              >
                {index}
              </span>
            ) : null}
            <span
              className={cn("label-micro", tone === "ink" ? "text-amber" : "text-copper")}
            >
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
 * Operational page header (docs/adr/0006-operational-workspace.md). The title
 * is set in the display serif, with the one sentence that says what the page is
 * for; actions sit at its right edge and wrap under it on a phone. `eyebrow`
 * carries a breadcrumb or the date above the title.
 */
export function PageHeader({
  title,
  description,
  actions,
  meta,
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow ? <div className="text-ink-2 mb-2 text-sm">{eyebrow}</div> : null}
          <h1 className="font-display text-ink text-[1.625rem] leading-tight font-normal tracking-[-0.01em] md:text-[2rem]">
            {title}
          </h1>
          {description ? (
            <p className="measure-wide text-ink-2 mt-1.5 text-sm">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex max-w-full flex-wrap items-center gap-2.5">{actions}</div>
        ) : null}
      </div>
      {meta ? <div>{meta}</div> : null}
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
            tone === "attention" ? "text-copper" : "text-ink",
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
