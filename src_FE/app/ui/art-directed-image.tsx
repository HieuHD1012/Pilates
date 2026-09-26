import { PHOTOGRAPHY, type PhotoId } from "~/content/photography";
import { cn } from "~/lib/cn";

/** One published, specifically briefed studio photograph. */
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

  return (
    <img
      src={brief.src}
      alt={brief.alt}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={cn("size-full object-cover", imgClassName, className)}
    />
  );
}
