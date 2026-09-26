import type { ReactNode } from "react";

import { TickRule } from "./tick-rule";

/**
 * The opening of every public page other than the homepage. One label, one
 * title, one paragraph, then the measuring edge. Repetition is the point:
 * pages that each invent their own header read as a collection of templates.
 */
export function PublicPageHeader({
  label,
  title,
  lede,
  aside,
}: {
  label: string;
  title: string;
  lede?: string;
  aside?: ReactNode;
}) {
  return (
    <header className="bg-sand">
      <div className="gutter mx-auto max-w-(--container-page)">
        <div className="grid items-center gap-x-8 gap-y-8 pt-12 pb-12 md:grid-cols-12 md:pt-16 md:pb-16">
          <div className={aside ? "md:col-span-6" : "md:col-span-7"}>
            <p className="label-micro">{label}</p>
            <h1 className="font-display text-d2 text-ink mt-5 font-light">{title}</h1>
            {lede ? <p className="measure text-lede text-ink-2 mt-6">{lede}</p> : null}
          </div>
          {aside ? <div className="md:col-span-5 md:col-start-8">{aside}</div> : null}
        </div>
        <TickRule />
      </div>
    </header>
  );
}
