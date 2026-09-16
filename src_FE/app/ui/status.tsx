import { cn } from "~/lib/cn";

export type StatusTone = "neutral" | "positive" | "attention" | "critical" | "info";

const TONE: Record<StatusTone, { badge: string; dot: string }> = {
  neutral: { badge: "text-ink-2 border-rule-2 bg-transparent", dot: "bg-ink-3" },
  positive: { badge: "text-success border-success/35 bg-success-wash", dot: "bg-success" },
  attention: {
    badge: "text-warning border-warning/35 bg-warning-wash",
    dot: "bg-warning",
  },
  critical: { badge: "text-danger border-danger/35 bg-danger-wash", dot: "bg-danger" },
  info: { badge: "text-info border-info/35 bg-info-wash", dot: "bg-info" },
};

/**
 * Status is never carried by colour alone: the badge always renders a written
 * label, and the dot is a redundant cue beside that label (WCAG 1.4.1).
 */
export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xs border px-2 py-0.5",
        "label-badge whitespace-nowrap",
        TONE[tone].badge,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", TONE[tone].dot)} />
      {children}
    </span>
  );
}

/**
 * Capacity is a number people act on, so it is written as a fraction with a
 * hairline meter beneath — not a coloured pill that means nothing on its own.
 */
export function CapacityMeter({
  booked,
  capacity,
  className,
}: {
  booked: number;
  capacity: number;
  className?: string;
}) {
  const ratio = capacity > 0 ? Math.min(booked / capacity, 1) : 0;
  const full = capacity > 0 && booked >= capacity;

  return (
    <span className={cn("inline-flex flex-col gap-1", className)}>
      <span className="figures text-ink-2 text-xs">
        {booked}/{capacity}
      </span>
      <span aria-hidden="true" className="bg-rule block h-px w-10">
        <span
          className={cn("block h-px transition-[width]", full ? "bg-danger" : "bg-ink")}
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
    </span>
  );
}
