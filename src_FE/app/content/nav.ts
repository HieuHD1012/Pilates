export interface NavItem {
  to: string;
  label: string;
}

/**
 * The public navigation. Six items maximum — a boutique studio with a
 * mega-menu is a studio that does not know what it sells.
 * Every entry here must resolve to a real, pre-rendered route.
 */
export const PUBLIC_NAV: NavItem[] = [
  { to: "/gioi-thieu", label: "Studio" },
  { to: "/dich-vu", label: "Hình thức tập" },
  { to: "/goi-tap", label: "Gói tập" },
  { to: "/huan-luyen-vien", label: "Huấn luyện viên" },
  { to: "/lich-tap", label: "Lịch tập" },
  { to: "/lien-he", label: "Liên hệ" },
];

/**
 * The footer carries every public page; the header carries six. Promotions is a
 * real route, so it must be reachable from somewhere — an orphan route is the
 * mirror of a nav entry pointing at a 404.
 */
export const PUBLIC_FOOTER_NAV: NavItem[] = [
  ...PUBLIC_NAV,
  { to: "/khuyen-mai", label: "Khuyến mãi" },
];

export const STUDENT_NAV: NavItem[] = [
  { to: "/hv/lop-hoc", label: "Lớp học" },
  { to: "/hv/lich-cua-toi", label: "Lịch của tôi" },
  { to: "/hv/goi-tap", label: "Gói tập" },
  { to: "/hv/tai-khoan", label: "Tài khoản" },
];

/** Reached from the account screen, not the tab bar — four tabs is the cap. */
export const STUDENT_SECONDARY_NAV: NavItem[] = [
  { to: "/hv/lich-su", label: "Lịch sử đặt lớp" },
];

export const TRAINER_NAV: NavItem[] = [
  { to: "/hlv/hom-nay", label: "Hôm nay" },
  { to: "/hlv/lich-day", label: "Lịch dạy" },
  { to: "/hlv/ho-so", label: "Hồ sơ" },
];

/**
 * The staff rail is grouped, not flat. Ten flat items read as a list of pages;
 * three groups read as the shape of the job — who you serve, what they buy,
 * and what the studio knows about itself.
 */
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const STAFF_NAV: NavItem[] = [{ to: "/studio/tong-quan", label: "Tổng quan" }];

export const STAFF_NAV_GROUPS: NavGroup[] = [
  {
    label: "Vận hành",
    items: [
      { to: "/studio/lich", label: "Lịch & lớp học" },
      { to: "/studio/khach-quan-tam", label: "Khách quan tâm" },
      { to: "/studio/hoc-vien", label: "Học viên" },
      { to: "/studio/huan-luyen-vien", label: "Huấn luyện viên" },
    ],
  },
  {
    label: "Gói & thanh toán",
    items: [
      { to: "/studio/goi-tap", label: "Gói tập" },
      { to: "/studio/thanh-toan", label: "Thanh toán" },
      { to: "/studio/so-buoi", label: "Sổ buổi" },
      { to: "/studio/gia-han", label: "Gia hạn" },
    ],
  },
  {
    label: "Báo cáo & hệ thống",
    items: [
      { to: "/studio/bao-cao", label: "Báo cáo" },
      { to: "/studio/tai-khoan", label: "Tài khoản" },
    ],
  },
];
