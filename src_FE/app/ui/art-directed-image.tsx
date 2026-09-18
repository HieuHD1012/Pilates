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

/**
 * PHƯƠNG ÁN A — "Ánh sáng": mép ảnh tan vào trang.
 *
 * Nền của những khung này gần như trắng, và nền trang là `#f2f0ea` — cũng gần
 * trắng. Cho hai mép tan ra thì cái hộp chữ nhật biến mất: thanh Cadillac đi
 * thẳng ra khỏi trang, và người đứng trong trang chứ không đứng trong một ô.
 *
 * Làm bằng `mask-image` chứ không nung vào tệp ảnh: mask tan về TRONG SUỐT nên
 * đúng trên mọi nền — khối `tone="deep"` và khối `tone="ink"` dùng chung một
 * tệp ảnh mà không lộ vệt màu. Nung vào ảnh thì phải có một tệp cho mỗi nền.
 *
 * Thủ pháp này chỉ dùng được vì ảnh ngược sáng. Đừng mang sang một khung có
 * hậu cảnh tối — ở đó nó sẽ đọc ra như một lỗi hiển thị.
 */
const FADE_STYLE = {
  maskImage:
    "linear-gradient(to bottom, transparent 0%, #000 22%), linear-gradient(to left, transparent 0%, #000 18%)",
  WebkitMaskImage:
    "linear-gradient(to bottom, transparent 0%, #000 22%), linear-gradient(to left, transparent 0%, #000 18%)",
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
} as const;

export function ArtDirectedImage({
  photo,
  className,
  imgClassName,
  sizes,
  priority = false,
  fade = false,
}: {
  photo: PhotoId;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  /** Tan mép trên và mép ngoài vào nền trang. Chỉ cho ảnh ngược sáng. */
  fade?: boolean;
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
        style={fade ? FADE_STYLE : undefined}
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
