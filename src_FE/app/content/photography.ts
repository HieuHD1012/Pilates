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
 * All five slots are filled from it. Frames 01-09 of that delivery carry a
 * burned-in logo at y 15-115 and a caption at y 1175-1218, so every crop taken
 * out of that template starts at row 125 and ends by row 1170 — which is why
 * three of the five are 1045px tall rather than 1280.
 *
 * Not one frame answers its brief completely, and each records where it falls
 * short. That is deliberate: the briefs stay as written so a reshoot has
 * something to shoot against, and `alt` describes what actually arrived.
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
    // studio-08, cropped 836x1045 out of the 856x1280 template. The room, the
    // reformers in a row, the window behind them. Falls short of the brief on
    // two counts: the light is midday rather than the 6:15 rake it asks for,
    // and there is no 16/9 of this room anywhere in the delivery — but the home
    // hero renders portrait at every breakpoint, so the ratio in `aspect` below
    // has never actually been the ratio on screen.
    src: "/photos/hero-836.webp",
    srcSet: "/photos/hero-418.webp 418w, /photos/hero-836.webp 836w",
    alt: "Phòng tập với các máy reformer đặt song song, ánh sáng lấy từ dãy cửa sổ phía sau.",
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
    // studio-12, cropped square. Not the frame the brief asks for — that one
    // needs two people, and no frame in the delivery has two. What this one has
    // instead is the quality the brief was really after: a body working, lit
    // from behind by the window wall, nothing performed at the camera.
    src: "/photos/method-754.webp",
    srcSet: "/photos/method-377.webp 377w, /photos/method-754.webp 754w",
    typeRegion: null,
    alt: "Học viên vươn người trên máy chair, ngược sáng trước bức tường cửa sổ.",
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
    // studio-03, cropped square out of the 856x1280 template. The most graphic
    // frame in the delivery: two arc barrels hung black on plaster over two
    // chairs, and nothing in the frame that needed tidying before the shot.
    // Room distance rather than the 40-60cm the brief asks for.
    src: "/photos/room-856.webp",
    srcSet: "/photos/room-428.webp 428w, /photos/room-856.webp 856w",
    typeRegion: null,
    alt: "Hai bộ arc barrel gắn trên tường, phía dưới là hai máy chair bằng gỗ.",
    aspect: "1 / 1",
    subject: "Reformer detail — springs, strap, carriage edge, worn leather or wood.",
    lighting: "Flat daylight, no flash. Texture over drama.",
    crop: "Object study. Square. Centred or deliberately offset to one third.",
    distance: "Macro-adjacent, 40–60cm.",
    feeling: "Material honesty. The equipment is a tool, not a prop.",
  }),

  practice: brief({
    id: "practice",
    // studio-15, 1280x853 cut to 1280x800 for the ratio. The 53 rows come off
    // the bottom, never the top, because the brief asks for headroom. One
    // deviation: no trainer is in the frame.
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
    // studio-11, the band above the figure: 660x283, the whole curtain wall
    // and nothing else. The brief asks for the view OR the light, and the
    // delivery has no view — every window is behind a sheer. So this is the
    // light, and only the light.
    //
    // 660px is the entire asset and this band runs full-bleed, so it is soft on
    // a wide screen. That is a fact about the delivery, not about the crop: the
    // studio's files came back from Zalo capped at 1280px on the long edge.
    src: "/photos/city-660.webp",
    srcSet: "/photos/city-330.webp 330w, /photos/city-660.webp 660w",
    typeRegion: null,
    alt: "Ánh sáng ban ngày xuyên qua lớp rèm voan phủ kín tường cửa sổ của studio.",
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
