/**
 * STUDIO FACTS
 *
 * Anything the studio has not confirmed is `null`, and the UI renders an
 * honest "đang cập nhật" state for it. Nothing in this file may be invented:
 * the address, phone number, opening hours, prices, trainer names and class
 * capacity of the Nha Trang branch are unknown to this repository. The Đà Nẵng
 * site's values are a different branch and must not be copied across.
 *
 * `npm run check:content` lists every unresolved fact.
 */

export interface StudioFacts {
  name: string;
  city: string;
  /** Street address, once supplied. */
  address: string | null;
  mapUrl: string | null;
  phone: string | null;
  zaloUrl: string | null;
  whatsappUrl: string | null;
  instagramUrl: string | null;
  email: string | null;
  /** e.g. "Thứ hai – Thứ bảy · 07:30 – 19:30". Unknown for Nha Trang. */
  openingHours: string | null;
}

export const STUDIO: StudioFacts = {
  name: "Soul Pilates",
  city: "Nha Trang",
  address: null,
  mapUrl: null,
  phone: null,
  zaloUrl: null,
  whatsappUrl: null,
  instagramUrl: null,
  email: null,
  openingHours: null,
};

/**
 * CONTENT DEBT
 *
 * The audit's single largest gap was not a design decision: nobody owned the
 * missing content, and nothing broke while it stayed missing. `check:content`
 * printed an inventory and always exited zero, so the only mechanism that could
 * have created pressure was inert — which is how "visible pendingness" started
 * to look like a brand attribute instead of a deadline.
 *
 * Every fact below is now a tracked task. `npm run verify` fails while a
 * REQUIRED fact is still missing and has no owner and no date against it, and
 * again once that date has passed. Assigning an owner and a date is a two-minute
 * human decision; it is deliberately not something this file can invent.
 */
export interface ContentDebtItem {
  key: keyof StudioFacts;
  label: string;
  /** Blocks launch. The site cannot credibly trade without it. */
  required: boolean;
  /** Who is getting it. A role is acceptable; an invented person is not. */
  owner: string | null;
  /** ISO date, e.g. "2026-09-05". */
  due: string | null;
}

export const CONTENT_DEBT: ContentDebtItem[] = [
  { key: "address", label: "Địa chỉ studio", required: true, owner: null, due: null },
  { key: "phone", label: "Số điện thoại", required: true, owner: null, due: null },
  { key: "openingHours", label: "Giờ mở cửa", required: true, owner: null, due: null },
  { key: "zaloUrl", label: "Liên kết Zalo", required: true, owner: null, due: null },
  { key: "mapUrl", label: "Liên kết bản đồ", required: true, owner: null, due: null },
  { key: "email", label: "Email liên hệ", required: false, owner: null, due: null },
  { key: "whatsappUrl", label: "WhatsApp", required: false, owner: null, due: null },
  { key: "instagramUrl", label: "Instagram", required: false, owner: null, due: null },
];

/** CONFIRMED (Phạm vi xác nhận, Q3): Group and Private. No Duo. */
export const CLASS_FORMATS = [
  {
    id: "group" as const,
    name: "Lớp nhóm",
    sub: "Group",
    /** Capacity is configured per class by the studio; it is not a brand claim. */
    body: "Một nhóm nhỏ trên reformer, cùng một bài, nhưng mỗi người được chỉnh riêng. Huấn luyện viên vẫn nhìn thấy từng người trong suốt buổi tập.",
    forWho: [
      "Muốn duy trì lịch tập đều đặn",
      "Thích có nhịp chung và người tập cùng",
      "Đã quen các động tác cơ bản",
    ],
  },
  {
    id: "private" as const,
    name: "Lớp riêng",
    sub: "Private",
    body: "Một học viên, một huấn luyện viên. Bài tập được dựng theo cơ thể bạn — chấn thương cũ, thói quen tư thế, mục tiêu cụ thể.",
    forWho: [
      "Đang phục hồi sau chấn thương",
      "Buổi tập đầu tiên với reformer",
      "Cần điều chỉnh sâu về tư thế",
    ],
  },
];

/**
 * CONFIRMED (Q6): the refund window for a cancelled booking.
 * The frontend displays these as the studio's published policy; the backend
 * remains the only thing that decides whether a specific booking is refunded.
 */
export const CANCELLATION_POLICY = {
  group: 4,
  private: 8,
} as const;

/** How a first visit actually works in this system. Not a marketing promise. */
export const FIRST_VISIT_STEPS = [
  {
    index: "01",
    title: "Để lại thông tin",
    body: "Tên, số điện thoại và điều bạn đang muốn cải thiện. Không cần tài khoản.",
  },
  {
    index: "02",
    title: "Studio liên hệ lại",
    body: "Nhân viên gọi để nghe rõ tình trạng của bạn và tư vấn hình thức lớp phù hợp.",
  },
  {
    index: "03",
    title: "Chọn gói và lịch",
    body: "Gói tập được ghi nhận vào hồ sơ của bạn cùng số buổi và thời hạn cụ thể.",
  },
  {
    index: "04",
    title: "Đặt lớp trực tuyến",
    body: "Từ buổi thứ hai trở đi, bạn tự đặt, đổi hoặc hủy lớp trong tài khoản của mình.",
  },
];
