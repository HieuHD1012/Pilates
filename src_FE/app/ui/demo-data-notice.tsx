import { cn } from "~/lib/cn";

/**
 * A development-only marker that the data on screen is fixture data.
 *
 * Without it, a screenshot of the dev server is indistinguishable from a
 * screenshot of the real studio — which is how invented trainers and timetables
 * end up in a client review deck. It is compiled out of production builds by
 * `import.meta.env.DEV`, so it costs nothing in the shipped bundle.
 */
export function DemoDataNotice({ className }: { className?: string }) {
  if (!import.meta.env.DEV) return null;

  return (
    <p
      className={cn(
        "border-warning/40 bg-warning-wash text-warning border-l-2 px-2.5 py-1.5",
        "label-badge",
        className,
      )}
    >
      Dữ liệu mẫu dùng cho phát triển — không phải lịch thật của studio.
    </p>
  );
}
