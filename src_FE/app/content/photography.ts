/**
 * ART DIRECTION BRIEFS
 *
 * The photographed room and practice in this experimental reference branch
 * come from the same owner, under the former J Pilates identity. The two
 * marked equipment frames use minimally cleaned derivatives; see
 * docs/reference-variant.md for exact provenance. Unfilled roles remain null.
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
    alt: "Người tập giữ tư thế trên máy reformer tại phòng tập thực tế.",
    aspect: "landscape source, in a split stage with a separate text panel",
    typeRegion: null,
    subject: "A person practicing a controlled stretch on a reformer in the actual studio.",
    lighting: "Existing daylight from the window, unchanged.",
    crop: "Keep the full action and enough machine to identify the activity.",
    distance: "Room-scale, full body.",
    feeling: "A credible first step into the practice.",
  }),

  method: brief({
    id: "method",
    src: null,
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
    src: "/images/studio/room-architecture-clean.webp",
    typeRegion: null,
    alt: "Không gian studio thật với các máy reformer và thiết bị Pilates.",
    aspect: "portrait source, large studio-stage crop",
    subject: "The actual room with reformers and related equipment.",
    lighting: "Existing room light, unchanged.",
    crop: "Show equipment arrangement and windows without placing type on the photograph.",
    distance: "Wide room evidence.",
    feeling: "A clear view of where the visitor would practice.",
  }),

  practice: brief({
    id: "practice",
    src: "/images/studio/chair-practice.jpg",
    typeRegion: null,
    alt: "Người tập giữ tư thế trên thiết bị Pilates dạng ghế bên cửa sổ.",
    aspect: "portrait source",
    subject: "One person practicing a controlled pose on a Pilates chair.",
    lighting: "Backlit against the existing window.",
    crop: "Full body and chair visible.",
    distance: "Medium-wide.",
    feeling: "Concentration rather than performance.",
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
