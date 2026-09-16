import { cn } from "~/lib/cn";

/**
 * Renders a fact the studio has not supplied yet.
 *
 * The alternative — inventing an address, a price or a phone number so the
 * layout looks finished — would ship a lie to real visitors. This says so
 * plainly instead, and stays quiet enough not to damage the page.
 */
export function PendingFact({ label, className }: { label: string; className?: string }) {
  return (
    <span
      // Inherits the parent's colour so it stays legible on both the sand
      // page and the ink footer; ink-3 fails AA for text on either.
      className={cn("italic opacity-75", className)}
      title={`${label} sẽ được cập nhật khi studio cung cấp`}
    >
      Đang cập nhật
    </span>
  );
}
