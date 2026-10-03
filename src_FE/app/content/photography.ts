/**
 * ART DIRECTION BRIEFS
 *
 * Reference experiment: the owner confirmed the source studio photographs are
 * from the same place under its former name. The selected frames have concrete
 * editorial roles documented in docs/reference-variant.md. Other slots remain
 * null until a truthful photograph exists.
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
    alt: "Học viên tập trên máy reformer trong phòng Pilates ở Nha Trang.",
    aspect: "wide opening spread with a subject-safe mobile crop",
    typeRegion: null,
    subject: "One person mid-movement on a reformer in the actual room.",
    lighting: "Window light from the real room, retained from the owner photograph.",
    crop: "Keep the whole body and enough of the reformer to identify the apparatus.",
    distance: "Wide enough to read both person and machine.",
    feeling: "A practice in progress, rather than a posed portrait.",
  }),

  method: brief({
    id: "method",
    src: "/images/studio/practice-fold.jpg",
    typeRegion: null,
    alt: "Người tập gập người và kiểm soát thăng bằng trên ghế Pilates.",
    aspect: "paired portrait sequence",
    subject: "One Pilates chair exercise in its compressed phase.",
    lighting: "Actual backlight through the studio curtains.",
    crop: "Match the extended phase beside it; keep body and chair visible.",
    distance: "Full-body medium view.",
    feeling: "A controlled beginning to a movement.",
  }),

  room: brief({
    id: "room",
    src: "/images/studio/room-architecture-clean.webp",
    typeRegion: null,
    alt: "Các máy reformer được sắp theo hàng trong phòng tập Nha Trang.",
    aspect: "bounded portrait studio chapter",
    subject: "The actual Pilates room with reformers arranged in rows.",
    lighting: "Actual window and ceiling light, not a fabricated luxury setting.",
    crop: "Retain the aisles between machines; exclude the former brand mark.",
    distance: "Room-wide.",
    feeling: "A credible view of the place the customer may visit.",
  }),

  practice: brief({
    id: "practice",
    src: "/images/studio/practice-extend.jpg",
    typeRegion: null,
    alt: "Cùng người tập vươn thân và hai tay trên ghế Pilates.",
    aspect: "paired portrait sequence",
    subject: "The same Pilates chair exercise in its extended phase.",
    lighting: "Actual backlight through the studio curtains.",
    crop: "Match the compressed phase beside it; keep body and chair visible.",
    distance: "Full-body medium view.",
    feeling: "Extension with visible control.",
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
