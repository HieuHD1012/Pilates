import { PHOTOGRAPHY, type PhotoId } from "~/content/photography";
import { cn } from "~/lib/cn";

/** Render the configured studio image or reserve its frame while an asset is missing. */
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
  const asset = PHOTOGRAPHY[photo];

  if (asset.src) {
    return (
      <img
        src={asset.src}
        alt={asset.alt}
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
      aria-label={asset.alt}
      data-photo-placeholder={asset.id}
      className={cn(
        "border-rule bg-sand-deep relative size-full overflow-hidden border",
        className,
      )}
    />
  );
}
