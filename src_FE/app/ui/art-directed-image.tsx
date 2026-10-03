import { PHOTOGRAPHY, type PhotoId } from "~/content/photography";
import { cn } from "~/lib/cn";

/**
 * Renders a photograph, or — until the studio supplies one — a placeholder that
 * holds the exact frame the design expects.
 *
 * The placeholder is deliberately austere. If a slot looked better full of
 * stock photography than empty, the layout was leaning on the picture, and the
 * design would have been wrong (docs/REFERENCE_LOCK.md).
 *
 * `disclose` marks the first concept image on a page with a small "illustration"
 * note. It reads the source, not a flag: once a frame is replaced by an approved
 * studio photograph the note disappears without anyone remembering to remove it.
 */
export function ArtDirectedImage({
  photo,
  className,
  imgClassName,
  sizes,
  priority = false,
  disclose = false,
}: {
  photo: PhotoId;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  /** `true` puts the note bottom-left; "top-right" when type overlaps that corner. */
  disclose?: boolean | "top-right";
}) {
  const brief = PHOTOGRAPHY[photo];

  if (brief.src) {
    const isConcept = brief.src.startsWith("/images/concept/");
    const image = (
      <img
        src={brief.src}
        alt={brief.alt}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className={cn("size-full object-cover", imgClassName, !disclose && className)}
      />
    );

    if (!disclose) return image;

    return (
      <div className={cn("relative size-full", className)}>
        {image}
        {isConcept ? (
          <p
            className={cn(
              "bg-ink-deep/65 text-sand absolute flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs backdrop-blur-[6px]",
              disclose === "top-right"
                ? "top-3 right-3 md:top-4 md:right-4"
                : "bottom-3 left-3 md:bottom-4 md:left-4",
            )}
          >
            <span aria-hidden="true" className="bg-amber size-1.5 rounded-full" />
            Ảnh minh họa · chờ chụp tại studio
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={brief.alt}
      data-photo-placeholder={brief.id}
      className={cn(
        "border-rule bg-sand-deep relative size-full overflow-hidden border",
        className,
      )}
    ></div>
  );
}
