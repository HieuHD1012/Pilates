import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/lib/cn";

/**
 * The opening of a public page that is not led by a photograph. One label, one
 * title, one paragraph and, when the page has one ask, that ask on the right,
 * aligned to the paragraph's last line. Repetition is the point: pages that
 * each invent their own header read as a collection of templates.
 *
 * `title` accepts an <em> for the second clause; it is set in italic copper,
 * the one typographic accent of the direction.
 */
export function PublicPageHeader({
  label,
  title,
  lede,
  aside,
  className,
}: {
  label: string;
  title: ReactNode;
  lede?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("bg-sand", className)}>
      <div className="gutter mx-auto max-w-(--container-page)">
        <div className="grid gap-x-6 gap-y-8 pt-12 pb-14 md:pt-20 md:pb-18 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="label-micro text-copper">{label}</p>
            <h1 className="font-display text-d1 text-ink [&_em]:text-copper mt-5 font-light [&_em]:font-light">
              {title}
            </h1>
            {lede ? <p className="measure text-lede text-ink-2 mt-6">{lede}</p> : null}
          </div>
          {aside ? (
            <div className="lg:col-span-4 lg:col-start-9 lg:self-end">{aside}</div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/**
 * The left column of a ruled section: a heading that names what the right
 * columns contain. Every public section uses the same 4 / 8 split so the page
 * reads as one grid, not a stack of components.
 */
export function SectionRail({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("lg:col-span-4", className)}>
      <h2 className="font-display text-d2 text-ink [&_em]:text-copper font-light">
        {title}
      </h2>
      {children}
    </div>
  );
}

/**
 * A short list of qualities ("phù hợp với…"). Each item is a check and a
 * phrase, packed close: three short phrases do not need a full-width ruled row
 * each, which stretched them into a table and pushed everything below away.
 */
export function CheckList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {items.map((item) => (
        <li key={item} className="text-ink flex items-start gap-3 text-base">
          <Check aria-hidden="true" className="text-copper mt-1 size-4 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Opening hours are stored as "days · times". Breaking at the separator keeps
 * each half whole; letting the line wrap anywhere split "07:30 –" from "19:30".
 */
export function HoursText({ value }: { value: string }) {
  return (
    <>
      {value.split(" · ").map((part) => (
        <span key={part} className="block whitespace-nowrap">
          {part}
        </span>
      ))}
    </>
  );
}
