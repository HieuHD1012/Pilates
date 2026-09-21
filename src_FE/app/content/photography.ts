/**
 * ART DIRECTION — MỘT KHUNG, MỘT VỊ TRÍ, MỘT LÝ DO
 *
 * Every image slot is declared as a brief before a picture exists, and each
 * brief now also records the frame that answers it and what had to be cut away.
 * `src` stays null until a frame exists for it; `<ArtDirectedImage>` then
 * renders a designed placeholder holding the exact ratio, so no layout decision
 * was ever made to flatter a picture that is not there.
 *
 * The studio sent 21 frames on 28.08.2026 (`../docs/thiet-ke/anh-studio/`), and
 * they are two different shoots:
 *
 *   01–09, 17   Fluorescent equipment documentation. Green cast, cluttered
 *               backgrounds, a burned-in logo at the top and a caption bar at
 *               the bottom. Inventory, not brand photography.
 *   11–15, 19–21  People working against the sheer-curtain window wall. High
 *               key, clean, backlit, with real shape.
 *
 * Only the second shoot is used here. Mixing the two is what made the earlier
 * pass read as cheap: a premium serif page beside a storeroom photograph.
 *
 * Every crop is produced by `docs/thiet-ke/anh-studio/dung-anh.py`, which holds
 * the per-frame crop box and grade. That script is the record — not this file —
 * of why each picture looks the way it does.
 *
 * Shared direction for a reshoot (docs/REFERENCE_LOCK.md):
 *   Light      Window light, shaped by the room. Shadow may go deep; nothing
 *              is filled. The backlit curtain wall is this studio's one real
 *              asset — shoot into it.
 *   Colour     Warm neutral. Wood, plaster, skin, black springs. No teal grade.
 *   Distance   Close enough to read a hand, or far enough to read the room.
 *              Never the mid-distance of a stock library.
 *   Body       Working, not posing. Eyes down or closed.
 *   Frame      Nothing enters the frame that would have to be tidied first:
 *              no carts, no spray bottles, no stacked mats, no cardboard.
 */

export interface PhotoBrief {
  id: string;
  typeRegion: string | null;
  /** null until a frame exists that answers the brief. */
  src: string | null;
  srcSet: string | null;
  /**
   * Cùng những bề rộng đó, mã hoá AVIF. Đi SONG SONG với `srcSet`, không thay
   * thế: `<picture>` đưa AVIF ra trước và tự lùi về WebP khi trình duyệt không
   * đọc được, nên không có thiết bị nào mất ảnh. Null khi `src` null.
   */
  avifSrcSet: string | null;
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
    // studio-13. Body AND architecture in one frame: the Cadillac's steel cage
    // draws the frame, the figure hangs inside it, the curtain wall lights it
    // from behind. A hero needs a geometry — the previous frame (studio-08) was
    // a room inventory with no subject at all.
    src: "/photos/hero-643.webp",
    srcSet: "/photos/hero-321.webp 321w, /photos/hero-643.webp 643w",
    avifSrcSet: "/photos/hero-321.avif 321w, /photos/hero-643.avif 643w",
    alt: "Học viên treo người trên khung Cadillac, ngược sáng trước tường rèm voan.",
    aspect: "4 / 5",
    typeRegion: null,
    subject:
      "One body inside the apparatus, holding. The frame of the machine is the composition.",
    lighting:
      "Backlit by the window wall. The figure reads as shape before it reads as a person.",
    crop: "Portrait. The top bar crosses the frame; the floor is out.",
    distance: "Whole body, 3–4m.",
    feeling: "Control, suspended. Effort that does not look like effort.",
  }),

  method: brief({
    id: "method",
    // studio-12. One movement at full extension. The slot was square and the
    // square amputated the reaching hands, which are the entire subject — so
    // the slot is 4/5 now. The picture decides the frame, not the grid.
    src: "/photos/method-754.webp",
    srcSet: "/photos/method-377.webp 377w, /photos/method-754.webp 754w",
    avifSrcSet: "/photos/method-377.avif 377w, /photos/method-754.avif 754w",
    typeRegion: null,
    alt: "Học viên vươn hết tay lên cao trên máy chair, ngược sáng trước cửa sổ.",
    aspect: "4 / 5",
    subject: "A single movement carried to full extension — the reach, not the rest.",
    lighting: "Backlit. Skin and curtain are the only two values in the frame.",
    crop: "Portrait, hands inside the frame with air above them.",
    distance: "Whole body, 3m.",
    feeling: "Precision. This is what a small class actually buys.",
  }),

  room: brief({
    id: "room",
    // studio-20. The equipment alone against the light: plywood, ladder, pad.
    // studio-03 (two black arc barrels) was the previous choice and is the
    // nearest rival — more graphic, but its tan vinyl reads orange against
    // #f2f0ea and the studio's mark sits in the middle of it.
    src: "/photos/room-1043.webp",
    srcSet: "/photos/room-521.webp 521w, /photos/room-1043.webp 1043w",
    avifSrcSet: "/photos/room-521.avif 521w, /photos/room-1043.avif 1043w",
    typeRegion: null,
    alt: "Ladder barrel bằng gỗ đứng một mình trước tường rèm voan.",
    aspect: "1 / 1",
    subject: "One piece of apparatus, alone, as an object.",
    lighting: "Backlit, flat on the object. Texture over drama.",
    crop: "Square. The burned-in 'J PILATES' tag at the foot of the frame is cut away.",
    distance: "Room distance, the object filling two thirds of the width.",
    feeling: "Material honesty. The equipment is a tool, not a prop.",
  }),

  practice: brief({
    id: "practice",
    // studio-15. The right third of this frame is a tower, a barrel and a wall
    // of straps stacked on top of each other; it is cropped out. What is left
    // is the figure, the reformer rail, and the curtain.
    src: "/photos/practice-819.webp",
    srcSet: "/photos/practice-409.webp 409w, /photos/practice-819.webp 819w",
    avifSrcSet: "/photos/practice-409.avif 409w, /photos/practice-819.avif 819w",
    typeRegion: null,
    alt: "Học viên giữ tư thế chùng chân trên máy reformer, ngược sáng trước cửa sổ.",
    aspect: "16 / 10",
    subject: "One student mid-repetition, holding.",
    lighting: "Backlit against the window. Face in shade is fine.",
    crop: "The rail line runs through the frame; the equipment pile on the right is gone.",
    distance: "Medium-wide, 3–4m.",
    feeling: "Concentration. Not exertion, not performance.",
  }),

  welcome: brief({
    id: "welcome",
    // studio-11. The sign-in panel is a full-height half-screen column. It used
    // to borrow the square `room` frame and let object-cover decide what
    // survived; a tall panel gets a tall frame of its own.
    src: "/photos/welcome-660.webp",
    srcSet: "/photos/welcome-330.webp 330w, /photos/welcome-660.webp 660w",
    avifSrcSet: "/photos/welcome-330.avif 330w, /photos/welcome-660.avif 660w",
    typeRegion: null,
    alt: "Học viên cúi người trên máy chair, ngược sáng trước tường rèm voan.",
    aspect: "3 / 4",
    subject: "A body at the start of a movement, quiet.",
    lighting: "Backlit by the window wall.",
    crop: "Tall. Nothing but the figure, the chair and the curtain.",
    distance: "Whole body, 3m.",
    feeling: "The room you are signing in to.",
  }),

  /**
   * A trainer's portrait, which the studio has not supplied.
   *
   * `src` stays null on purpose. The trainers page used to fall back to the
   * `method` frame — a photograph of a student, mid-exercise, standing in for a
   * named person. A designed empty frame says "no portrait yet"; a borrowed one
   * says something false about whoever it sits beside.
   */
  trainerPortrait: brief({
    id: "trainerPortrait",
    src: null,
    srcSet: null,
    avifSrcSet: null,
    typeRegion: null,
    alt: "Chưa có ảnh chân dung huấn luyện viên.",
    aspect: "4 / 5",
    subject: "One trainer, head and shoulders, in the room they teach in.",
    lighting: "Window light from the side. No flash, no white background.",
    crop: "Portrait. Eyes at the upper third.",
    distance: "1–1.5m.",
    feeling: "A person you would let correct your shoulder.",
  }),
} as const satisfies Record<string, PhotoBrief>;

export type PhotoId = keyof typeof PHOTOGRAPHY;
