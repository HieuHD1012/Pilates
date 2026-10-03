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
 *
 * A quiet dashed tag, not a warning bar: it labels the data beside it and must
 * not compete with it.
 */
export function DemoDataNotice({ className }: { className?: string }) {
  if (!MOCKS_ENABLED) return null;

  return (
    <p
      className={cn(
        "border-rule-2 text-ink-2 inline-flex items-center gap-2 rounded-sm border border-dashed px-2.5 py-1 text-xs",
        className,
      )}
    >
      <span aria-hidden="true" className="bg-warning size-1.5 rounded-full" />
      Dữ liệu mẫu · không phải lịch thật của studio
    </p>
  );
}
