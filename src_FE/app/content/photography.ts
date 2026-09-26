/**
 * The three photographs published from the studio's source folder.
 * Selection and excluded frames are recorded in docs/photo-composition-from-zero.md.
 * Source JPEGs are copied unchanged; the layouts use their natural ratios.
 */
export interface PhotoBrief {
  id: string;
  src: string;
  alt: string;
  aspect: string;
  role: string;
  source: string;
}

export const PHOTOGRAPHY = {
  hero: {
    id: "hero",
    src: "/photos/reformer-session.jpg",
    alt: "Một người tập giữ tư thế chùng chân trên máy reformer trước cửa sổ.",
    aspect: "3 / 2",
    role: "Evidence of the reformer session described by the home introduction",
    source: "docs/thiet-ke/anh-studio/studio-15.jpg",
  },
  room: {
    id: "room",
    src: "/photos/reformer-room.jpg",
    alt: "Nhiều máy reformer được xếp trong một phòng tập sáng cửa sổ.",
    aspect: "3 / 4",
    role: "Evidence of the physical room described on the Studio page",
    source: "docs/thiet-ke/anh-studio/studio-17.jpg",
  },
  welcome: {
    id: "welcome",
    src: "/photos/studio-welcome.jpg",
    alt: "Một người tập Pilates trên máy chair trước tường rèm sáng.",
    aspect: "3 / 4",
    role: "Quiet studio atmosphere beside the sign-in task",
    source: "docs/thiet-ke/anh-studio/studio-11.jpg",
  },
} as const satisfies Record<string, PhotoBrief>;

export type PhotoId = keyof typeof PHOTOGRAPHY;
