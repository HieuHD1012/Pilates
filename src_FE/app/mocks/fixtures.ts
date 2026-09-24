import type {
  AccountResponse,
  AnnouncementResponse,
  BookingResponse,
  ClassSessionResponse,
  LeadResponse,
  LedgerEntryResponse,
  PackageTypeResponse,
  PaymentResponse,
  ProgressPhotoResponse,
  RenewalContactResponse,
  Role,
  StudentPackageResponse,
  StudentResponse,
  TrainerResponse,
} from "~/lib/api/schema";

/**
 * DEMO DATA — a development stand-in for the studio's own records.
 *
 * Every shape here is the backend's, field for field, so a screen built against
 * these fixtures is built against the real contract. What it is NOT is a
 * specification: the numbers are invented, which is why every screen that shows
 * them in development also shows `<DemoDataNotice>`, and why nothing in `app/`
 * may import this file (enforced by `no-restricted-imports`).
 *
 * Names are obviously fictional on purpose. A plausible Vietnamese name in a
 * fixture is a person who does not exist appearing in a client review deck.
 */

const STUDIO_OFFSET = "+07:00";

/** A studio-local date key, `n` days from today. */
export function dayKey(offset: number): string {
  const now = new Date();
  const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // +07:00 means the studio's calendar day starts seven hours earlier in UTC.
  const studio = new Date(utc + 7 * 3600_000 + offset * 86_400_000);
  return studio.toISOString().slice(0, 10);
}

export function at(dayOffset: number, time: string): string {
  return `${dayKey(dayOffset)}T${time}:00${STUDIO_OFFSET}`;
}

export const DEMO_USERS: Record<Role, AccountResponse> = {
  ADMIN: {
    id: 1,
    email: "admin@demo.local",
    full_name: "DEMO Quản trị",
    phone: "0900000001",
    role: "ADMIN",
    status: "ACTIVE",
    is_active: true,
    created_at: at(-300, "09:00"),
    student_id: null,
    trainer_id: null,
  },
  STAFF: {
    id: 2,
    email: "letan@demo.local",
    full_name: "DEMO Lễ tân",
    phone: "0900000002",
    role: "STAFF",
    status: "ACTIVE",
    is_active: true,
    created_at: at(-280, "09:00"),
    student_id: null,
    trainer_id: null,
  },
  TRAINER: {
    id: 3,
    email: "hlv@demo.local",
    full_name: "DEMO Huấn luyện viên",
    phone: "0900000003",
    role: "TRAINER",
    status: "ACTIVE",
    is_active: true,
    created_at: at(-260, "09:00"),
    student_id: null,
    trainer_id: 1,
  },
  STUDENT: {
    id: 4,
    email: "hocvien@demo.local",
    full_name: "DEMO Học viên",
    phone: "0900000004",
    role: "STUDENT",
    status: "ACTIVE",
    is_active: true,
    created_at: at(-120, "09:00"),
    student_id: 1,
    trainer_id: null,
  },
};

export const DEMO_ACCOUNTS: AccountResponse[] = [
  DEMO_USERS.ADMIN,
  DEMO_USERS.STAFF,
  DEMO_USERS.TRAINER,
  DEMO_USERS.STUDENT,
  {
    id: 5,
    email: "nghiviec@demo.local",
    full_name: "DEMO Tài khoản khóa",
    phone: null,
    role: "TRAINER",
    status: "PENDING_ACTIVATION",
    is_active: false,
    created_at: at(-200, "09:00"),
    student_id: null,
    trainer_id: 2,
  },
];

export const DEMO_TRAINERS: TrainerResponse[] = [
  {
    id: 1,
    full_name: "DEMO Huấn luyện viên",
    phone: "0900000003",
    bio: "Nội dung giới thiệu mẫu dùng cho phát triển.",
    specialties: "Reformer, Mat",
    photo_key: null,
    is_public: true,
    is_active: true,
    user_id: 3,
    created_at: at(-260, "09:00"),
  },
  {
    id: 2,
    full_name: "DEMO HLV thứ hai",
    phone: null,
    bio: null,
    specialties: null,
    photo_key: null,
    is_public: false,
    is_active: false,
    user_id: 5,
    created_at: at(-200, "09:00"),
  },
];

export const DEMO_STUDENTS: StudentResponse[] = [
  {
    id: 1,
    user_id: 4,
    full_name: "DEMO Học viên",
    phone: "0900000004",
    email: "hocvien@demo.local",
    dob: "1995-04-12",
    note: "Ghi chú mẫu dùng cho phát triển.",
    status: "ACTIVE",
    created_at: at(-120, "09:00"),
  },
  {
    id: 2,
    user_id: null,
    full_name: "DEMO Học viên hai",
    phone: "0900000005",
    email: null,
    dob: null,
    note: null,
    status: "ACTIVE",
    created_at: at(-60, "09:00"),
  },
  {
    id: 3,
    user_id: null,
    full_name: "DEMO Học viên tạm nghỉ",
    phone: "0900000006",
    email: null,
    dob: null,
    note: null,
    status: "INACTIVE",
    created_at: at(-400, "09:00"),
  },
];

export const DEMO_PACKAGE_TYPES: PackageTypeResponse[] = [
  {
    id: 1,
    name: "DEMO Gói 10 buổi nhóm",
    price: "3000000.00",
    credits: 10,
    duration_days: 90,
    class_type: "GROUP",
    is_selling: true,
  },
  {
    id: 2,
    name: "DEMO Gói 5 buổi riêng",
    price: null,
    credits: 5,
    duration_days: 60,
    class_type: "PRIVATE",
    is_selling: true,
  },
  {
    id: 3,
    name: "DEMO Gói ngừng bán",
    price: "1500000.00",
    credits: 4,
    duration_days: 30,
    class_type: "GROUP",
    is_selling: false,
  },
];

export const DEMO_PACKAGES: StudentPackageResponse[] = [
  {
    id: 1,
    student_id: 1,
    package_type_id: 1,
    name_snapshot: "DEMO Gói 10 buổi nhóm",
    price_snapshot: "3000000.00",
    credits_snapshot: 10,
    class_type_snapshot: "GROUP",
    start_date: dayKey(-40),
    end_date: dayKey(50),
    status: "ACTIVE",
    balance_cached: 6,
    created_at: at(-40, "09:30"),
  },
  {
    id: 2,
    student_id: 2,
    package_type_id: 2,
    name_snapshot: "DEMO Gói 5 buổi riêng",
    price_snapshot: "2500000.00",
    credits_snapshot: 5,
    class_type_snapshot: "PRIVATE",
    start_date: dayKey(-20),
    end_date: dayKey(10),
    status: "ACTIVE",
    balance_cached: 2,
    created_at: at(-20, "10:00"),
  },
];

export const DEMO_LEDGER: LedgerEntryResponse[] = [
  {
    id: 1,
    delta: 10,
    balance_after: 10,
    reason_code: "PACKAGE_SOLD",
    note: null,
    booking_id: null,
    actor_user_id: 2,
    created_at: at(-40, "09:30"),
  },
  {
    id: 2,
    delta: -1,
    balance_after: 9,
    reason_code: "BOOKING_DEDUCT",
    note: null,
    booking_id: 1,
    actor_user_id: 4,
    created_at: at(-30, "06:00"),
  },
  {
    id: 3,
    delta: 1,
    balance_after: 10,
    reason_code: "CANCEL_REFUND",
    note: null,
    booking_id: 1,
    actor_user_id: 4,
    created_at: at(-29, "08:00"),
  },
  {
    id: 4,
    delta: -4,
    balance_after: 6,
    reason_code: "BOOKING_DEDUCT",
    note: "Bốn buổi đã tập",
    booking_id: null,
    actor_user_id: 4,
    created_at: at(-20, "06:00"),
  },
];

export const DEMO_PAYMENTS: PaymentResponse[] = [
  {
    id: 1,
    student_package_id: 1,
    amount: "3000000.00",
    method: "TRANSFER",
    status: "CONFIRMED",
    note: "Chuyển khoản đủ",
    recorded_by: 2,
    recorded_at: at(-40, "09:35"),
    confirmed_by: 1,
    confirmed_at: at(-40, "10:00"),
    voided_by: null,
    voided_at: null,
    void_reason: null,
  },
  {
    id: 2,
    student_package_id: 2,
    amount: "2500000.00",
    method: "CASH",
    status: "PENDING",
    note: null,
    recorded_by: 2,
    recorded_at: at(-20, "10:05"),
    confirmed_by: null,
    confirmed_at: null,
    voided_by: null,
    voided_at: null,
    void_reason: null,
  },
];

export const DEMO_LEADS: LeadResponse[] = [
  {
    id: 1,
    full_name: "DEMO Khách quan tâm",
    phone: "0900000007",
    need: "Quan tâm lớp nhóm. Muốn tập buổi sáng.",
    source: "website",
    status: "NEW",
    assigned_to: null,
    converted_student_id: null,
    created_at: at(-2, "20:10"),
  },
  {
    id: 2,
    full_name: "DEMO Khách đã liên hệ",
    phone: "0900000008",
    need: null,
    source: "zalo",
    status: "CONTACTED",
    assigned_to: 2,
    converted_student_id: null,
    created_at: at(-9, "11:00"),
  },
];

export const DEMO_ANNOUNCEMENTS: AnnouncementResponse[] = [
  {
    id: 1,
    title: "DEMO Thông báo lịch nghỉ",
    body: "Nội dung thông báo mẫu dùng cho phát triển.",
    is_published: true,
    publish_at: at(-3, "08:00"),
    created_by: 2,
    created_at: at(-3, "07:50"),
    updated_at: null,
    updated_by: null,
  },
];

export const DEMO_PHOTOS: ProgressPhotoResponse[] = [
  {
    id: 1,
    student_id: 1,
    taken_at: at(-90, "07:00"),
    uploaded_by: 3,
    created_at: at(-90, "07:05"),
  },
];

export const DEMO_RENEWAL_CONTACTS: RenewalContactResponse[] = [
  {
    id: 1,
    student_id: 2,
    contacted_at: at(-4, "15:00"),
    result: "Đã gọi, khách hẹn tuần sau quyết định.",
    next_contact_date: dayKey(3),
    actor_user_id: 2,
  },
];

/**
 * A fortnight of classes around today, so week-stepping has something on either
 * side of the current week.
 */
export function buildDemoClasses(): ClassSessionResponse[] {
  const sessions: ClassSessionResponse[] = [];
  let id = 1;

  for (let offset = -7; offset <= 14; offset += 1) {
    // Read at UTC midnight: a `+07:00` anchor lands the instant on the previous
    // evening, and `getUTCDay()` would then skip Mondays while claiming Sundays.
    const weekday = new Date(`${dayKey(offset)}T00:00:00Z`).getUTCDay();
    if (weekday === 0) continue; // The studio is closed on Sundays in this fixture.

    sessions.push({
      id: id++,
      starts_at: at(offset, "06:00"),
      ends_at: at(offset, "06:50"),
      trainer_id: 1,
      class_type: "GROUP",
      capacity: 6,
      status: "SCHEDULED",
      recurrence_id: "demo-recurrence",
      cancel_reason: null,
    });

    if (weekday % 2 === 1) {
      sessions.push({
        id: id++,
        starts_at: at(offset, "17:30"),
        ends_at: at(offset, "18:20"),
        trainer_id: 2,
        class_type: "PRIVATE",
        capacity: 2,
        status: "SCHEDULED",
        recurrence_id: null,
        cancel_reason: null,
      });
    }
  }

  return sessions;
}

/** A handful of bookings against the fixture classes, for the demo student. */
export function buildDemoBookings(classes: ClassSessionResponse[]): BookingResponse[] {
  const past = classes.filter((item) => item.starts_at < at(0, "00:00")).slice(-3);
  const upcoming = classes.filter((item) => item.starts_at > at(0, "23:59")).slice(0, 2);

  let id = 1;
  return [
    ...past.map((item, index) => ({
      id: id++,
      class_session_id: item.id,
      student_id: 1,
      student_package_id: 1,
      status: index === 0 ? ("NO_SHOW" as const) : ("ATTENDED" as const),
      created_at: item.starts_at,
    })),
    ...upcoming.map((item) => ({
      id: id++,
      class_session_id: item.id,
      student_id: 1,
      student_package_id: 1,
      status: "BOOKED" as const,
      created_at: at(-1, "12:00"),
    })),
  ];
}
