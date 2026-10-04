/** Temporary rendering assets; replace with approved studio photography before release. */
export interface PhotoAsset {
  id: string;
  src: string | null;
  alt: string;
}

export type PhotoId = "hero" | "room" | "group" | "private" | "craft" | "arrival";

export const PHOTOGRAPHY: Record<PhotoId, PhotoAsset> = {
  hero: {
    id: "hero",
    src: "/images/concept/hero-coaching.webp",
    alt: "Ảnh minh họa: huấn luyện viên hướng dẫn một người tập trên máy reformer.",
  },
  room: {
    id: "room",
    src: "/images/concept/studio-room.webp",
    alt: "Ảnh minh họa một phòng tập nhỏ có các máy reformer đặt song song.",
  },
  group: {
    id: "group",
    src: "/images/concept/group-practice.webp",
    alt: "Ảnh minh họa: lớp nhóm nhỏ tập trên các máy reformer cùng huấn luyện viên.",
  },
  private: {
    id: "private",
    src: "/images/concept/private-coaching.webp",
    alt: "Ảnh minh họa: huấn luyện viên hướng dẫn riêng một người tập reformer.",
  },
  craft: {
    id: "craft",
    src: "/images/concept/equipment-detail.webp",
    alt: "Ảnh minh họa: bàn tay điều chỉnh lò xo trên máy reformer trước buổi tập.",
  },
  arrival: {
    id: "arrival",
    src: "/images/concept/arrival.webp",
    alt: "Ảnh minh họa lối vào một phòng tập reformer nhỏ và sáng.",
  },
};
