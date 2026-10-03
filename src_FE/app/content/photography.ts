/**
 * Temporary art direction concepts for the public site.
 *
 * The owner asked for a fresh image pass from main and explicitly allowed
 * generated interim photographs. These are fictional scenes, not photographs
 * of the Nha Trang premises, staff or customers. Replace them with approved
 * studio assets before launch. The single disclosure lives in the public footer;
 * per-image captions would interrupt the composition without adding context.
 *
 * Reference sites inform composition and image role, never Soul's palette or
 * business claims. See docs/IMAGE_LANGUAGE.md.
 */
export interface PhotoBrief {
  id: string;
  src: string | null;
  alt: string;
  role: string;
  compositionReference: string;
}

export type PhotoId = "hero" | "room" | "group" | "private" | "craft" | "arrival";

export const PHOTOGRAPHY: Record<PhotoId, PhotoBrief> = {
  hero: {
    id: "hero",
    src: "/images/concept/hero-coaching.webp",
    alt: "Ảnh minh họa: huấn luyện viên hướng dẫn một người tập trên máy reformer.",
    role: "The service and human guidance in one frame",
    compositionReference: "BLOK: movement and the promise share the opening composition",
  },
  room: {
    id: "room",
    src: "/images/concept/studio-room.webp",
    alt: "Ảnh minh họa một phòng tập nhỏ có các máy reformer đặt song song.",
    role: "A readable place, not a decorative equipment close-up",
    compositionReference: "Surrenne: architecture and light establish the destination",
  },
  group: {
    id: "group",
    src: "/images/concept/group-practice.webp",
    alt: "Ảnh minh họa: lớp nhóm nhỏ tập trên các máy reformer cùng huấn luyện viên.",
    role: "Make the group format visibly different from a private session",
    compositionReference: "Pvolve: show the class format beside its explanation",
  },
  private: {
    id: "private",
    src: "/images/concept/private-coaching.webp",
    alt: "Ảnh minh họa: huấn luyện viên hướng dẫn riêng một người tập reformer.",
    role: "Show one-to-one attention and body alignment",
    compositionReference: "Third Space: human coaching is separate proof from facilities",
  },
  craft: {
    id: "craft",
    src: "/images/concept/equipment-detail.webp",
    alt: "Ảnh minh họa: bàn tay điều chỉnh lò xo trên máy reformer trước buổi tập.",
    role: "Show the preparation and precision behind the session",
    compositionReference:
      "Tracksmith: close editorial detail supports a larger activity story",
  },
  arrival: {
    id: "arrival",
    src: "/images/concept/arrival.webp",
    alt: "Ảnh minh họa lối vào một phòng tập reformer nhỏ và sáng.",
    role: "Help a first-time guest picture entering the space",
    compositionReference: "Barry's: make the first visit concrete and approachable",
  },
};
