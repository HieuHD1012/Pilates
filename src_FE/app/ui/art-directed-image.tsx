import { PHOTOGRAPHY, type PhotoId } from "~/content/photography";
import { cn } from "~/lib/cn";

/**
 * Renders a photograph, or — until the studio supplies one — a placeholder that
 * holds the exact frame the design expects.
 *
 * The placeholder is deliberately austere. If a slot looked better full of
 * stock photography than empty, the layout was leaning on the picture, and the
 * design would have been wrong (docs/REFERENCE_LOCK.md).
 */
export function ArtDirectedImage({
  photo,
  className,
  imgClassName,
  sizes,
  priority = false,
}: {
  photo: PhotoId;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const brief = PHOTOGRAPHY[photo];

  if (brief.src) {
    return (
      <img
        src={brief.src}
        srcSet={brief.srcSet ?? undefined}
        alt={brief.alt}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className={cn("size-full object-cover", imgClassName, className)}
      />
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
