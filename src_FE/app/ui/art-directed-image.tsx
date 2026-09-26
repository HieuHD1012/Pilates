import { PHOTOGRAPHY, type PhotoId } from "~/content/photography";
import { cn } from "~/lib/cn";

/** A real studio photograph, with its natural dimensions and accessible description. */
export function ArtDirectedImage({
  photo,
  className,
  priority = false,
}: {
  photo: PhotoId;
  className?: string;
  priority?: boolean;
}) {
  const frame = PHOTOGRAPHY[photo];

  return (
    <img
      src={frame.src}
      alt={frame.alt}
      width={frame.width}
      height={frame.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={cn("size-full object-cover", className)}
    />
  );
}
