import { cn } from "~/lib/cn";
import { MOCKS_ENABLED } from "~/lib/mocks";

/**
 * A marker that the data on screen is fixture data.
 *
 * Without it, a screenshot of the dev server is indistinguishable from a
 * screenshot of the real studio — which is how invented trainers and timetables
 * end up in a client review deck.
 *
 * It renders only while MSW is actually answering. A dev server pointed at the
 * real backend (`VITE_ENABLE_MSW=false`) shows a real studio's real schedule,
 * and stamping "dữ liệu mẫu" across it is the same failure in the other
 * direction. Production builds drop it either way.
 */
export function DemoDataNotice({ className }: { className?: string }) {
  if (!MOCKS_ENABLED) return null;

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
