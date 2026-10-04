import { Button } from "./button";

/** Array-only endpoints do not expose a total; never invent a last-page count. */
export function PageControls({
  offset,
  limit,
  count,
  pending,
  onChange,
}: {
  offset: number;
  limit: number;
  count: number;
  pending: boolean;
  onChange: (offset: number) => void;
}) {
  if (offset === 0 && count < limit) return null;
  return (
    <nav
      aria-label="Phân trang"
      className="rule-t flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5"
    >
      <span className="text-ink-2 text-sm">Trang {Math.floor(offset / limit) + 1}</span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={pending || offset === 0}
          onClick={() => onChange(Math.max(0, offset - limit))}
        >
          Trang trước
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={pending || count < limit}
          onClick={() => onChange(offset + limit)}
        >
          Trang sau
        </Button>
      </div>
    </nav>
  );
}
