/**
 * ART DIRECTION BRIEFS
 *
 * ELLA reference experiment (branch claude/ref-ella). The owner confirmed the
 * archive photographs are this studio under its former name; the derivatives
 * used here only remove the old "J" mark. Each frame has one role, documented in
 * docs/reference-variant.md, and the copy beside it never claims more than the
 * frame shows. `city` stays null: no truthful window/city frame exists yet, and
 * `<ArtDirectedImage>` keeps rendering the honest empty slot for it.
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
    alt: "Một người tập động tác tách chân trên máy reformer trong phòng tập có rèm trắng và ánh sáng cửa sổ.",
    aspect: "right ~60% of the hero from md; a 5 / 4 band under the text on a phone",
    typeRegion:
      "None on the photograph. Type sits on a solid cream field to the left; the " +
      "frame's own bright wall edge is what dissolves into that field, so no " +
      "pixel of the body or the machine ever carries text and nothing is dimmed.",
    subject: "One person mid-movement on a reformer in the actual Nha Trang room.",
    lighting: "Window light through white curtains, retained from the owner photograph.",
    crop: "Keep the whole body, the footbar and the carriage; bias right so the left wall carries the blend.",
    distance: "Wide enough to read body and machine together.",
    feeling: "A practice in progress, calm and light — not a posed portrait.",
  }),

  method: brief({
    id: "method",
    src: "/images/studio/practice-fold.jpg",
    typeRegion: null,
    alt: "Người tập gập thân, giữ thăng bằng trên ghế Pilates trước rèm cửa sáng.",
    aspect: "4 / 5, paired with practice",
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
    alt: "Các máy reformer bằng gỗ đặt song song thành hàng trong phòng tập ở Nha Trang.",
    aspect: "portrait panel image, 4 / 5 to 3 / 4",
    subject: "The actual room with reformers set side by side in rows.",
    lighting: "Actual window and ceiling light; not presented as a luxury interior.",
    crop: "Keep the aisles between machines; the ceiling may be cropped away.",
    distance: "Room-wide.",
    feeling: "A credible view of the place a visitor will walk into.",
  }),

  practice: brief({
    id: "practice",
    src: "/images/studio/practice-extend.jpg",
    typeRegion: null,
    alt: "Cùng người tập vươn thân và hai tay trên ghế Pilates.",
    aspect: "4 / 5, paired with method",
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
