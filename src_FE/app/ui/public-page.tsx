import type { ReactNode } from "react";

/**
 * The opening of every public page other than the homepage. One ruled label,
 * one title, one paragraph, set on a short version of the home page's satin
 * light field (Pearl reference variant). Repetition is the point: pages that
 * each invent their own header read as a collection of templates.
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
    <header className="pl-page-head pl-satin pl-satin--short">
      <div className="gutter mx-auto max-w-(--container-page)">
        <div className="grid gap-x-8 gap-y-6 pt-12 pb-14 md:grid-cols-12 md:pt-20 md:pb-20">
          <div className="md:col-span-8 lg:col-span-7">
            <p className="pl-ruled">{label}</p>
            <h1 className="pl-h2 text-ink mt-6">{title}</h1>
            {lede ? <p className="measure text-lede text-ink-2 mt-6">{lede}</p> : null}
          </div>
          {aside ? (
            <div className="md:col-span-4 md:col-start-9 md:self-end">{aside}</div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
