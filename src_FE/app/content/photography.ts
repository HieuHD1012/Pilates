/**
 * ART DIRECTION BRIEFS
 *
 * Pearl reference experiment. The owner confirmed that the archive photographs
 * in docs/thiet-ke/anh-studio show this Nha Trang room under its former name.
 * Only frames whose role is documented in docs/reference-variant.md carry a
 * `src`; the old "J" mark was removed from the two reformer frames and nothing
 * else in them was changed. The home hero is a CSS light field and deliberately
 * has no photograph. Every other slot stays null until a truthful frame exists —
 * a trainer portrait above all: no practice photograph may stand in for a
 * named person.
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
  /**
   * Not used by this variant. The Pearl study opens on a CSS light field, so
   * the hero asserts mood only and needs no photograph to prove a claim.
   */
  hero: brief({
    id: "hero",
    src: null,
    alt: "Phòng tập Soul Pilates Nha Trang vào buổi sáng sớm, ánh sáng tự nhiên đổ dài trên sàn gỗ và các máy reformer.",
    aspect: "3 / 4 on mobile, 16 / 9 from md",
    typeRegion: null,
    subject:
      "The empty studio before the first class. Reformers aligned, springs still, one window open.",
    lighting:
      "Early morning, 6:15–6:45. Low sun raking across the floor. Long shadows from the reformer rails are the composition.",
    crop: "Room-wide, horizon low, ceiling included. The rails must read as parallel lines.",
    distance: "Wide. No person, or one figure small and far, setting a spring.",
    feeling: "Order before effort. Quiet, exact, unhurried.",
  }),

  /** Role: illustration of control (first half of a matched pair). */
  method: brief({
    id: "method",
    src: "/images/studio/practice-fold.jpg",
    typeRegion: null,
    alt: "Người tập gập thân, giữ thăng bằng trên ghế Pilates trước rèm cửa sáng.",
    aspect: "4 / 5 pair, matched with `extend`",
    subject: "One Pilates chair exercise in its compressed phase. A chair, not a reformer.",
    lighting: "Actual backlight through the studio curtains; the figure reads as silhouette.",
    crop: "Match the extended phase beside it; keep the whole body and the chair.",
    distance: "Full-body medium view.",
    feeling: "A controlled beginning to a movement.",
  }),

  /** Role: illustration of control (second half of the pair). */
  extend: brief({
    id: "extend",
    src: "/images/studio/practice-extend.jpg",
    typeRegion: null,
    alt: "Cùng người tập vươn thân và hai tay lên cao trên ghế Pilates.",
    aspect: "4 / 5 pair, matched with `method`",
    subject: "The same chair exercise in its extended phase.",
    lighting: "Actual backlight through the studio curtains.",
    crop: "Match the compressed phase; keep body and chair visible.",
    distance: "Full-body medium view.",
    feeling: "Extension with visible control.",
  }),

  /** Role: place proof. Tall frame of the Về studio collage; Group chapter. */
  room: brief({
    id: "room",
    src: "/images/studio/room-architecture-clean.webp",
    typeRegion: null,
    alt: "Các máy reformer bằng gỗ đặt song song thành hàng trong phòng tập ở Nha Trang.",
    aspect: "portrait, cropped 4 / 5 on cards",
    subject: "The actual room with reformers arranged side by side.",
    lighting: "Actual window and ceiling light, not a fabricated luxury setting.",
    crop: "Retain the aisles between machines; the former brand mark is removed.",
    distance: "Room-wide.",
    feeling: "A credible view of the place a customer may visit.",
  }),

  /** Role: practice proof. Offset frame of the collage; Private chapter. */
  practice: brief({
    id: "practice",
    src: "/images/studio/reformer-action-clean.webp",
    typeRegion: null,
    alt: "Một người tập kéo dài chân trên máy reformer, sau lưng là rèm cửa sáng.",
    aspect: "landscape, cropped 4 / 3",
    subject: "One person mid-movement on a reformer in the actual room.",
    lighting: "Window light from the real room, retained from the owner photograph.",
    crop: "Keep the whole body and enough of the reformer to identify the apparatus.",
    distance: "Wide enough to read both person and machine.",
    feeling: "A practice in progress, rather than a posed portrait.",
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
