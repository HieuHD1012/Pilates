/**
 * A field that is legitimately empty for this record.
 *
 * Distinct from `<PendingFact>` on purpose. PendingFact means "the studio has not
 * given us this yet, and will" — it is content debt. This means "there is nothing
 * here, and that is a valid state": a student with no active package, an optional
 * email nobody recorded. Rendering both as "Đang cập nhật" told staff to wait for
 * something that was never coming.
 */
export function Absent({ children }: { children: string }) {
  return <span className="text-ink-2">{children}</span>;
}
