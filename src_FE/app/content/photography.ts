/**
 * ART DIRECTION BRIEFS
 *
 * The owner confirmed the supplied J Pilates photographs show the same room
 * under its earlier name. This reference variant uses three relevant frames:
 * one minimally edited to remove old equipment branding, one showing a real
 * Pilates chair movement, and one center-cropped room view. Other image slots
 * remain null rather than borrowing imagery that cannot prove their subject.
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
    src: "/images/studio/room-architecture-clean.webp",
    alt: "Phòng tập Pilates sáng tự nhiên với các máy được bố trí thành hàng.",
    aspect: "Wide architectural stage on desktop; tall room view on mobile",
    typeRegion: null,
    subject: "The actual studio room, its columns, windows and machines.",
    lighting: "Daylight and the room's existing ceiling lights.",
    crop: "Preserve enough depth to read the room; no copy over the apparatus.",
    distance: "Wide room view.",
    feeling: "An honest arrival into the actual place.",
  }),

  method: brief({
    id: "method",
    src: "/images/studio/pilates-chair.jpg",
    typeRegion: null,
    alt: "Một người giữ tư thế có kiểm soát trên ghế Pilates.",
    aspect: "4 / 5",
    subject: "A person working on a Pilates chair, showing control and focus.",
    lighting: "Natural light from the existing windows.",
    crop: "Keep body and chair in the frame.",
    distance: "Full-body portrait.",
    feeling: "Human scale after the room introduction.",
  }),

  room: brief({
    id: "room",
    src: "/images/studio/room-equipment.jpg",
    typeRegion: null,
    alt: "Các máy Pilates và phần không gian bên trong phòng tập.",
    aspect: "Wide interior crop",
    subject: "The equipment as part of the room.",
    lighting: "Existing studio daylight.",
    crop: "Center band excluding embedded former logo and address.",
    distance: "Room view.",
    feeling: "Practical place evidence on the Studio route.",
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
