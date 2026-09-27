/**
 * ART DIRECTION BRIEFS
 *
 * For this reference experiment, the owner confirmed that the supplied J
 * Pilates photographs show the same physical studio under its earlier name.
 * Three frames are used where the old logo/address is absent, removed by a
 * disclosed minimal edit, or cropped out.
 * The remaining slots stay null; a photograph of another subject cannot be
 * made to prove the missing claim. `<ArtDirectedImage>` preserves their layout.
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
    alt: "Một người giữ tư thế duỗi trên máy reformer trong phòng tập sáng tự nhiên.",
    aspect: "Full-width opening stage on desktop; subject retained on mobile",
    typeRegion: null,
    subject: "Working body and reformer in one frame, proving the class apparatus.",
    lighting: "Backlit by the room's window, without darkening the photo for type.",
    crop: "Keep the full extension and carriage; the solid text field takes the lower-left area.",
    distance: "Room-wide enough to read the body and apparatus together.",
    feeling: "Focused movement, not a staged fitness portrait.",
  }),

  method: brief({
    id: "method",
    src: "/images/studio/pilates-chair.jpg",
    typeRegion: null,
    alt: "Một người đang kiểm soát tư thế trên ghế Pilates.",
    aspect: "4 / 5",
    subject: "One person balancing on a Pilates chair; method, not a reformer service claim.",
    lighting: "Natural window light with visible shadow on the body.",
    crop: "Retain the whole body and chair on desktop; recompose for mobile.",
    distance: "Full-body portrait.",
    feeling: "Control and concentration.",
  }),

  room: brief({
    id: "room",
    src: "/images/studio/room-equipment.jpg",
    typeRegion: null,
    alt: "Các máy Pilates trong phòng tập sáng tự nhiên.",
    aspect: "Wide room frame, old top and bottom branding cropped out",
    subject: "Working equipment within the real studio room.",
    lighting: "Daylight from windows, no composited light.",
    crop: "Center band only; exclude former J Pilates logo and address.",
    distance: "Wide enough to show multiple machines and circulation space.",
    feeling: "Physical proof of the studio.",
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
