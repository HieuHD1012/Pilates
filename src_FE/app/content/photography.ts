/**
 * ART DIRECTION BRIEFS
 *
 * Every image slot in the product is declared as a brief before a picture
 * exists. Another branch's images are a different room, a different team and a
 * different city — using them here would be a lie about this one. `src` stays
 * null until the studio delivers a frame that answers the brief;
 * `<ArtDirectedImage>` renders a designed placeholder that reserves the exact
 * aspect ratio, so no layout shifts when the real photograph lands and no
 * design decision was ever made to flatter a stock image.
 *
 * The studio sent 21 frames on 28.08.2026 (`../docs/thiet-ke/anh-studio/`).
 * Two slots are filled from it. The other three are not, and each says what the
 * delivery was missing, so the next reader does not review the same 21 pictures
 * a second time to reach the same answer.
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
  /**
   * The widths `src` was rendered at, as an `img` srcset. Null while `src` is
   * null, and never null once it is not: `sizes` on its own does nothing, which
   * is how one 1280px file ends up being sent to a 390px phone.
   */
  srcSet: string | null;
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
    // 28.08.2026: nothing qualifies. The room was only shot portrait, so the
    // delivery holds no 16/9 of it at all, and no wall in it is dark enough to
    // carry the typeRegion below without the scrim that region forbids.
    src: null,
    srcSet: null,
    alt: "Phòng tập Soul Pilates Nha Trang vào buổi sáng sớm, ánh sáng tự nhiên đổ dài trên sàn gỗ và các máy reformer.",
    aspect: "3 / 4 on mobile, 16 / 9 from md",
    typeRegion:
      "Left third, full height. Continuous surface (wall or floor in shade), no " +
      "reformer rails crossing it. Luminance variance inside the region under " +
      "10%, and dark enough that #f2f0ea type clears 4.5:1 against the darkest " +
      "sampled pixel with no scrim. If the room does not offer this, the frame " +
      "is a reject — do not crop a blank area to manufacture it.",
    subject:
      "The empty studio before the first class. Reformers aligned, springs still, one window open.",
    lighting:
      "Early morning, 6:15–6:45. Low sun raking across the floor. Long shadows from the reformer rails are the composition.",
    crop: "Room-wide, horizon low, ceiling included. The rails must read as parallel lines.",
    distance: "Wide. No person, or one figure small and far, setting a spring.",
    feeling: "Order before effort. Quiet, exact, unhurried.",
  }),

  method: brief({
    id: "method",
    // 28.08.2026: nothing qualifies. Not one of the 21 frames has two people in
    // it, and an adjustment needs two.
    src: null,
    srcSet: null,
    typeRegion: null,
    alt: "Bàn tay huấn luyện viên chỉnh vị trí vai của học viên trên máy reformer.",
    aspect: "4 / 5",
    subject:
      "A trainer's hand correcting a shoulder or rib position. Two people, one adjustment.",
    lighting: "Side light from a window. The hand is lit; the background falls off.",
    crop: "Tight. Shoulder to elbow. Faces are not required and should not dominate.",
    distance: "Close — near enough to see pressure in the fingers.",
    feeling: "Attention. This is what a 1:3 class actually buys.",
  }),

  room: brief({
    id: "room",
    // studio-20 of the 28.08.2026 delivery, cropped to 1100x1100 out of
    // 1280x1280: a "J PILATES" pill is drawn over the floor, its outline
    // starting at row 1117, and the apparatus ends by row 1090, so the cut
    // clears the pill without touching a leg. It answers the brief on frame,
    // light and feeling and misses it twice: the apparatus is a ladder barrel
    // rather than a reformer, and it is shot at room distance rather than the
    // 40-60cm asked for. `alt` describes what arrived; the direction below
    // still describes what a reshoot should go and get.
    src: "/photos/room-1024.webp",
    srcSet: "/photos/room-512.webp 512w, /photos/room-1024.webp 1024w",
    typeRegion: null,
    alt: "Máy ladder barrel bằng gỗ đặt trước cửa sổ rèm voan, trong ánh sáng ban ngày.",
    aspect: "1 / 1",
    subject: "Reformer detail — springs, strap, carriage edge, worn leather or wood.",
    lighting: "Flat daylight, no flash. Texture over drama.",
    crop: "Object study. Square. Centred or deliberately offset to one third.",
    distance: "Macro-adjacent, 40–60cm.",
    feeling: "Material honesty. The equipment is a tool, not a prop.",
  }),

  practice: brief({
    id: "practice",
    // studio-15 of the 28.08.2026 delivery, 1280x853 cut to 1280x800 for the
    // ratio. The 53 rows come off the bottom, never the top, because the brief
    // asks for headroom. One deviation: no trainer is in the frame.
    src: "/photos/practice-1280.webp",
    srcSet: "/photos/practice-640.webp 640w, /photos/practice-1280.webp 1280w",
    typeRegion: null,
    alt: "Học viên giữ tư thế chùng chân trên máy reformer, ngược sáng trước cửa sổ.",
    aspect: "16 / 10",
    subject: "One student mid-repetition, holding. Trainer visible but not centred.",
    lighting: "Backlit against the window. Silhouette edge, face in shade is fine.",
    crop: "Full body, generous headroom, the rail line running through the frame.",
    distance: "Medium-wide, 3–4m.",
    feeling: "Concentration. Not exertion, not performance.",
  }),

  city: brief({
    id: "city",
    // 28.08.2026: nothing qualifies. Every window in the delivery sits behind a
    // sheer curtain, so it contains no view out and no letterbox of one.
    src: null,
    srcSet: null,
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
