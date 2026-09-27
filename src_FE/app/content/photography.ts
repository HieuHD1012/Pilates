/**
 * ART DIRECTION BRIEFS
 *
 * The owner identified the source photographs as the same place under its
 * former name. Selected real frames are given exact roles for this reference
 * variant; unsupported slots remain null.
 *
 * Shared direction for every frame (docs/REFERENCE_LOCK.md):
 *   Light      Hard equatorial daylight, shaped by the room. Windows are the
 *              only source. Shadow is allowed to go deep; nothing is filled.
 *   Colour     Warm neutral. Wood, plaster, skin, black springs. No teal grade,
 *              no crushed "cinematic" blacks, no orange-and-teal.
 *   Distance   Either close enough to read a hand's position, or far enough to
 *              read the whole room. Never the mid-distance of a stock library.
 *   Body       Working, not posing. Eyes down or closed. No smiling to camera.
 *   Motion     Sharp. Control is the subject; motion blur says the opposite.
 */

export interface PhotoBrief {
  id: string;
  /**
   * Where type may be set on this frame, if anywhere. Specified BEFORE the shoot
   * so the layout never has to rescue an unusable frame: under deadline the only
   * available rescue is a dark overlay, and an overlay stops the picture being a
   * photograph and turns it into a texture. A frame that misses this is a reject,
   * not a layout problem — and the region must already exist in the room for the
   * photograph's own reasons. Cropping a void to receive type is the same
   * offence as dimming, committed with a different tool.
   */
  typeRegion: string | null;
  /** null until the studio supplies the frame. */
  src: string | null;
  /** Written for a screen reader, not for SEO stuffing. */
  alt: string;
  aspect: string;
  subject: string;
  lighting: string;
  crop: string;
  distance: string;
  feeling: string;
}

function brief(b: PhotoBrief): PhotoBrief {
  return b;
}

export const PHOTOGRAPHY = {
  hero: brief({
    id: "hero",
    src: "/images/studio/reformer-action-clean.webp",
    alt: "Người tập đang thực hiện một chuyển động trên máy reformer trong phòng tập.",
    aspect: "wide action stage at desktop and mobile",
    typeRegion: null,
    subject: "One real person mid-movement on a reformer.",
    lighting: "Actual window light from the studio.",
    crop: "Keep the body and enough machine visible to identify reformer practice.",
    distance: "Full-body room view.",
    feeling: "Directed physical effort without posing to camera.",
  }),

  method: brief({
    id: "method",
    src: "/images/concept/hero-coaching.webp",
    typeRegion: null,
    alt: "Hình minh họa một huấn luyện viên hỗ trợ học viên tập trên reformer.",
    aspect: "landscape guidance module",
    subject: "Conceptual coaching interaction, not an actual Soul trainer or room.",
    lighting: "Generated conceptual image from the prior image-language experiment.",
    crop: "Keep both participants and the reformer visible.",
    distance: "Medium-wide.",
    feeling: "Attention to a learner's position.",
  }),

  room: brief({
    id: "room",
    src: "/images/studio/room-architecture-clean.webp",
    typeRegion: null,
    alt: "Phòng tập Pilates thực tế với các máy reformer xếp thành hàng.",
    aspect: "bounded room evidence",
    subject: "Actual room and reformer arrangement.",
    lighting: "Actual room light, without added amenities.",
    crop: "Show room arrangement and machine aisles.",
    distance: "Room-wide.",
    feeling: "Truthful place evidence.",
  }),

  practice: brief({
    id: "practice",
    src: null,
    typeRegion: null,
    alt: "Học viên đang giữ một tư thế trên máy reformer, tập trung vào hơi thở.",
    aspect: "16 / 10",
    subject: "One student mid-repetition, holding. Trainer visible but not centred.",
    lighting: "Backlit against the window. Silhouette edge, face in shade is fine.",
    crop: "Full body, generous headroom, the rail line running through the frame.",
    distance: "Medium-wide, 3–4m.",
    feeling: "Concentration. Not exertion, not performance.",
  }),

  city: brief({
    id: "city",
    src: null,
    typeRegion: null,
    alt: "Ánh sáng buổi chiều ở Nha Trang nhìn từ cửa sổ studio.",
    aspect: "21 / 9",
    subject:
      "The view or the light from the studio window. Nha Trang as light and air, not as a postcard.",
    lighting: "Late afternoon. Haze allowed. No saturated sunset.",
    crop: "Letterbox. Architecture or sky, no beach umbrellas, no boats.",
    distance: "Whatever the window gives.",
    feeling: "Where this studio is, without selling a holiday.",
  }),
} as const satisfies Record<string, PhotoBrief>;

export type PhotoId = keyof typeof PHOTOGRAPHY;
