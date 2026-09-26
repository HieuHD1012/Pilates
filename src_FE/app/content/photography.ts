/**
 * Real frames from the studio's supplied image set. The user confirmed that
 * J Pilates and Soul share the same owner and room. Composition decisions and
 * rejected frames are recorded in docs/photo-direction.md.
 */
export const PHOTOGRAPHY = {
  hero: {
    src: "/photos/reformer-session.jpg",
    alt: "Một người tập duỗi người có kiểm soát trên máy reformer bên cửa sổ.",
    width: 1280,
    height: 853,
  },
  method: {
    src: "/photos/controlled-movement.jpg",
    alt: "Một người tập giữ tư thế trên khung Cadillac trong phòng Pilates.",
    width: 1280,
    height: 1005,
  },
  room: {
    src: "/photos/reformer-room.jpg",
    alt: "Các máy reformer được bố trí trong phòng tập sáng cửa sổ.",
    width: 720,
    height: 1280,
  },
  welcome: {
    src: "/photos/chair-practice.jpg",
    alt: "Một người đang tập với máy Pilates chair trước cửa sổ.",
    width: 660,
    height: 1044,
  },
} as const;

export type PhotoId = keyof typeof PHOTOGRAPHY;
