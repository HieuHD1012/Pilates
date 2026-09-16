import { index, layout, prefix, route, type RouteConfig } from "@react-router/dev/routes";

/**
 * URL DESIGN
 *
 * Public routes use Vietnamese slugs — the audience searches in Vietnamese and
 * these are the URLs that get indexed. Authenticated areas are namespaced by
 * role so that a glance at any URL says who it belongs to:
 *
 *   /            public, pre-rendered (see app/content/prerender-paths.ts)
 *   /hv/*        học viên   — student
 *   /hlv/*       huấn luyện viên — trainer
 *   /studio/*    studio & nhân viên — staff
 *
 * Every /hv, /hlv and /studio URL is served by the SPA fallback and must be
 * bookmarkable and refreshable. See docs/ROUTING.md.
 */
export default [
  layout("layouts/public-layout.tsx", [
    index("routes/public/home.tsx"),
    route("gioi-thieu", "routes/public/about.tsx"),
    route("dich-vu", "routes/public/services.tsx"),
    route("goi-tap", "routes/public/packages.tsx"),
    route("huan-luyen-vien", "routes/public/trainers.tsx"),
    route("lich-tap", "routes/public/schedule.tsx"),
    route("khuyen-mai", "routes/public/promotions.tsx"),
    route("lien-he", "routes/public/contact.tsx"),
    route("dat-tu-van", "routes/public/consultation.tsx"),
  ]),

  layout("layouts/auth-layout.tsx", [
    route("dang-nhap", "routes/auth/login.tsx"),
    route("quen-mat-khau", "routes/auth/forgot-password.tsx"),
    route("dat-lai-mat-khau", "routes/auth/reset-password.tsx"),
  ]),

  ...prefix("hv", [
    layout("layouts/student-layout.tsx", [
      index("routes/student/index.tsx"),
      route("lop-hoc", "routes/student/classes.tsx"),
      route("lop-hoc/:classId", "routes/student/class-detail.tsx"),
      route("lich-cua-toi", "routes/student/my-schedule.tsx"),
      route("lich-su", "routes/student/booking-history.tsx"),
      route("goi-tap", "routes/student/packages.tsx"),
      route("tai-khoan", "routes/student/account.tsx"),
    ]),
  ]),

  ...prefix("hlv", [
    layout("layouts/trainer-layout.tsx", [
      index("routes/trainer/index.tsx"),
      route("hom-nay", "routes/trainer/today.tsx"),
      route("lich-day", "routes/trainer/schedule.tsx"),
      route("lop/:classId", "routes/trainer/class-detail.tsx"),
      route("ho-so", "routes/trainer/profile.tsx"),
    ]),
  ]),

  ...prefix("studio", [
    layout("layouts/staff-layout.tsx", [
      index("routes/staff/index.tsx"),
      route("tong-quan", "routes/staff/dashboard.tsx"),

      route("lich", "routes/staff/calendar.tsx"),
      route("lich/:classId", "routes/staff/class-detail.tsx"),

      route("khach-quan-tam", "routes/staff/leads.tsx"),
      route("khach-quan-tam/:leadId", "routes/staff/lead-detail.tsx"),

      route("hoc-vien", "routes/staff/students.tsx"),
      route("hoc-vien/:studentId", "routes/staff/student-detail.tsx"),

      route("huan-luyen-vien", "routes/staff/trainers.tsx"),
      route("huan-luyen-vien/:trainerId", "routes/staff/trainer-detail.tsx"),

      route("goi-tap", "routes/staff/packages.tsx"),
      route("thanh-toan", "routes/staff/payments.tsx"),
      route("so-buoi", "routes/staff/session-ledger.tsx"),
      route("gia-han", "routes/staff/renewals.tsx"),

      route("bao-cao", "routes/staff/reports.tsx"),
      route("bao-cao/doanh-thu", "routes/staff/report-revenue.tsx"),
      route("bao-cao/lop-hoc", "routes/staff/report-classes.tsx"),
      route("bao-cao/huan-luyen-vien", "routes/staff/report-trainers.tsx"),

      route("tai-khoan", "routes/staff/accounts.tsx"),
    ]),
  ]),

  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
