import { cn } from "~/lib/cn";

/**
 * The signature device of this direction: a hairline carrying tick marks on the
 * column positions of the page grid. It reads as an architectural section mark
 * and as a measuring edge — which is what the design is named for.
 *
 * Used sparingly: page-level boundaries only, never inside content.
 */
export function TickRule({
  ticks = 12,
  tone = "light",
  className,
}: {
  ticks?: number;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-1.5 w-full border-t",
        tone === "light" ? "border-rule" : "border-rule-dark",
        className,
      )}
    >
      {Array.from({ length: ticks + 1 }, (_, index) => (
        <span
          key={index}
          className={cn(
            "absolute top-0 h-1.5 w-px",
            tone === "light" ? "bg-rule" : "bg-rule-dark",
          )}
          style={{ left: `${(index / ticks) * 100}%` }}
        />
      ))}
    </div>
  );
}
