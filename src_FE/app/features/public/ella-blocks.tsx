import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { Children, useState, type ReactNode, type UIEvent } from "react";

import { cn } from "~/lib/cn";

/**
 * Building blocks of the ELLA reference variant (docs/reference-variant.md).
 * Presentation only: every fact passed into them comes from app/content or the
 * API, never from these components.
 */

/** Centred eyebrow + large serif heading + optional intro. */
export function SectionHead({
  eyebrow,
  title,
  intro,
  as: Heading = "h2",
  align = "center",
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  as?: "h1" | "h2";
  align?: "center" | "start";
  aside?: ReactNode;
}) {
  return (
    <div className={cn("el-head", align === "start" && "el-head-start")}>
      <p className="label-micro el-eyebrow">{eyebrow}</p>
      <Heading className={Heading === "h1" ? "el-h1" : "el-h2"}>{title}</Heading>
      {intro ? <p className="el-head-intro">{intro}</p> : null}
      {aside ? <div className="el-head-aside">{aside}</div> : null}
    </div>
  );
}

/** The round peach disc that carries a line icon — the variant's tactile mark. */
export function IconChip({
  icon: Icon,
  size = "md",
}: {
  icon: LucideIcon;
  size?: "sm" | "md";
}) {
  return (
    <span aria-hidden="true" className={cn("el-chip", size === "sm" && "el-chip-sm")}>
      <Icon className="el-chip-icon" strokeWidth={1.5} />
    </span>
  );
}

/**
 * A grid on wide screens, a horizontal swipe row with position dots below `until`.
 * The dots are a position read-out, not controls: the row itself is the control
 * (touch swipe, trackpad, or Tab through the links inside the cards).
 */
export function SwipeRow({
  children,
  className,
  label,
  until = "md",
}: {
  children: ReactNode;
  className?: string;
  label: string;
  /** The breakpoint from which the row becomes a grid. */
  until?: "md" | "lg";
}) {
  const count = Children.count(children);
  const [active, setActive] = useState(0);

  function onScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    setActive(Math.round((el.scrollLeft / max) * (count - 1)));
  }

  return (
    <div className={cn("el-swipe", until === "lg" ? "el-swipe-lg" : "el-swipe-md")}>
      <div
        className={cn("el-swipe-track", className)}
        onScroll={onScroll}
        role="group"
        aria-label={label}
      >
        {children}
      </div>
      <div className="el-dots" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <span key={index} className={cn("el-dot", index === active && "el-dot-active")} />
        ))}
      </div>
    </div>
  );
}

/** One row of a photo-panel spec list: chip, label, value. */
export function SpecRow({
  icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="el-spec">
      <IconChip icon={icon} size="sm" />
      <span>
        <span className="el-spec-label">{label}</span>
        <span className="el-spec-value">{children}</span>
      </span>
    </li>
  );
}

/** A soft accordion row. Native <details>, so it works pre-rendered and without JS. */
export function FaqItem({
  icon,
  question,
  children,
}: {
  icon: LucideIcon;
  question: string;
  children: ReactNode;
}) {
  return (
    <details className="el-faq">
      <summary className="el-faq-summary">
        <IconChip icon={icon} size="sm" />
        <span className="el-faq-q">{question}</span>
        <ChevronDown aria-hidden="true" className="el-faq-chevron" strokeWidth={1.5} />
      </summary>
      <div className="el-faq-a">{children}</div>
    </details>
  );
}

/** The walnut decision card that closes an interior route — ELLA's featured card, wide. */
export function ClosingCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="el-card el-cta" data-field="dark">
      <div>
        <h2 className="el-h2">{title}</h2>
        <p>{body}</p>
      </div>
      <div className="el-cta-action">{children}</div>
    </div>
  );
}
