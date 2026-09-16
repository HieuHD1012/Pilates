/**
 * DEVELOPMENT FIXTURES — not real studio data.
 *
 * Every name, price and figure below is deliberately marked "DEMO" so that a
 * screenshot of a mocked screen can never be mistaken for the real studio.
 * No real trainer, student, price or review appears in this repository.
 */

import { addDays, startOfStudioWeek } from "~/lib/format";
import type {
  Booking,
  ClassSession,
  ClassType,
  SessionUser,
  StudentPackage,
  Trainer,
} from "~/lib/api/types";

export const DEMO_TRAINERS: Trainer[] = [
  {
    id: "t-demo-1",
    fullName: "HLV Demo A",
    headline: "Dữ liệu mẫu — hồ sơ thật do studio cung cấp",
    specialties: ["Reformer", "Phục hồi cột sống"],
    photoUrl: null,
    active: true,
    // Demo identities never reach a public surface. The public trainers page
    // renders its empty state instead, which is the truth.
    publicProfile: false,
  },
  {
    id: "t-demo-2",
    fullName: "HLV Demo B",
    headline: "Dữ liệu mẫu — hồ sơ thật do studio cung cấp",
    specialties: ["Reformer", "Tiền sản"],
    photoUrl: null,
    active: true,
    publicProfile: false,
  },
];

const TEMPLATE: Array<{
  dayOffset: number;
  hour: number;
  minute: number;
  durationMin: number;
  type: ClassType;
  title: string;
  trainerIndex: number;
  capacity: number;
  booked: number;
}> = [
  {
    dayOffset: 0,
    hour: 6,
    minute: 30,
    durationMin: 50,
    type: "group",
    title: "Reformer Flow",
    trainerIndex: 0,
    capacity: 4,
    booked: 4,
  },
  {
    dayOffset: 0,
    hour: 8,
    minute: 0,
    durationMin: 50,
    type: "group",
    title: "Reformer Cơ bản",
    trainerIndex: 1,
    capacity: 4,
    booked: 2,
  },
  {
    dayOffset: 0,
    hour: 17,
    minute: 30,
    durationMin: 50,
    type: "private",
    title: "Private",
    trainerIndex: 0,
    capacity: 1,
    booked: 1,
  },
  {
    dayOffset: 1,
    hour: 6,
    minute: 30,
    durationMin: 50,
    type: "group",
    title: "Reformer Flow",
    trainerIndex: 1,
    capacity: 4,
    booked: 1,
  },
  {
    dayOffset: 1,
    hour: 9,
    minute: 0,
    durationMin: 50,
    type: "group",
    title: "Reformer Cơ bản",
    trainerIndex: 0,
    capacity: 4,
    booked: 3,
  },
  {
    dayOffset: 1,
    hour: 18,
    minute: 30,
    durationMin: 50,
    type: "group",
    title: "Reformer Chiều",
    trainerIndex: 1,
    capacity: 4,
    booked: 0,
  },
  {
    dayOffset: 2,
    hour: 7,
    minute: 0,
    durationMin: 50,
    type: "private",
    title: "Private",
    trainerIndex: 0,
    capacity: 1,
    booked: 0,
  },
  {
    dayOffset: 2,
    hour: 17,
    minute: 30,
    durationMin: 50,
    type: "group",
    title: "Reformer Flow",
    trainerIndex: 1,
    capacity: 4,
    booked: 4,
  },
  {
    dayOffset: 3,
    hour: 6,
    minute: 30,
    durationMin: 50,
    type: "group",
    title: "Reformer Flow",
    trainerIndex: 0,
    capacity: 4,
    booked: 2,
  },
  {
    dayOffset: 3,
    hour: 18,
    minute: 30,
    durationMin: 50,
    type: "group",
    title: "Reformer Chiều",
    trainerIndex: 0,
    capacity: 4,
    booked: 3,
  },
  {
    dayOffset: 4,
    hour: 8,
    minute: 0,
    durationMin: 50,
    type: "group",
    title: "Reformer Cơ bản",
    trainerIndex: 1,
    capacity: 4,
    booked: 1,
  },
  {
    dayOffset: 4,
    hour: 17,
    minute: 30,
    durationMin: 50,
    type: "private",
    title: "Private",
    trainerIndex: 0,
    capacity: 1,
    booked: 0,
  },
  {
    dayOffset: 5,
    hour: 8,
    minute: 0,
    durationMin: 50,
    type: "group",
    title: "Reformer Cuối tuần",
    trainerIndex: 1,
    capacity: 4,
    booked: 2,
  },
  {
    dayOffset: 5,
    hour: 9,
    minute: 30,
    durationMin: 50,
    type: "group",
    title: "Reformer Cuối tuần",
    trainerIndex: 0,
    capacity: 4,
    booked: 4,
  },
];

function isoAt(dateKey: string, hour: number, minute: number): string {
  // Studio timezone is UTC+7 with no DST, so a fixed offset is exact here.
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${dateKey}T${hh}:${mm}:00+07:00`;
}

export function buildDemoClasses(referenceDate = new Date()): ClassSession[] {
  const weekStart = startOfStudioWeek(referenceDate);

  return [-7, 0, 7].flatMap((weekShift) =>
    TEMPLATE.map((slot, index) => {
      const dateKey = addDays(weekStart, slot.dayOffset + weekShift);
      const startsAt = isoAt(dateKey, slot.hour, slot.minute);
      const endsAt = isoAt(
        dateKey,
        slot.hour + Math.floor((slot.minute + slot.durationMin) / 60),
        (slot.minute + slot.durationMin) % 60,
      );
      const trainer = DEMO_TRAINERS[slot.trainerIndex] ?? DEMO_TRAINERS[0]!;

      return {
        id: `c-${dateKey}-${index}`,
        type: slot.type,
        title: slot.title,
        trainer: { id: trainer.id, fullName: trainer.fullName, photoUrl: null },
        startsAt,
        endsAt,
        capacity: slot.capacity,
        bookedCount: slot.booked,
        waitlistCount: slot.booked >= slot.capacity ? 2 : 0,
        status: "scheduled" as const,
        room: null,
        note: null,
        cancellationReason: null,
      };
    }),
  );
}

export const DEMO_STUDENT: SessionUser = {
  id: "s-demo-1",
  fullName: "Học viên Demo",
  role: "student",
  phone: "0900 000 000",
  email: null,
};

export const DEMO_STAFF: SessionUser = {
  id: "u-demo-staff",
  fullName: "Nhân viên Demo",
  role: "staff",
  phone: null,
  email: null,
};

export const DEMO_TRAINER_USER: SessionUser = {
  id: "t-demo-1",
  fullName: "HLV Demo A",
  role: "trainer",
  phone: null,
  email: null,
};

export const DEMO_PACKAGE: StudentPackage = {
  id: "sp-demo-1",
  packageName: "Gói Demo 10 buổi",
  allowedClassTypes: ["group"],
  sessionsTotal: 10,
  sessionsRemaining: 4,
  startDate: "2026-07-01",
  expiryDate: "2026-09-30",
  status: "active",
  renewalDue: true,
};

export const demoBookings: Booking[] = [];

/* ══════════════════════════════════════════════════════════════════════════
   STUDIO OPERATIONS FIXTURES
   Every label is visibly synthetic. Soul-2's equivalents used plausible
   Vietnamese personal names, which is how a demo screenshot becomes a claim
   about real people — see AGENTS.md rule 19.
   ══════════════════════════════════════════════════════════════════════════ */

import type {
  AccountRow,
  BookingHistoryEntry,
  ClassReport,
  Lead,
  LeadDetail,
  LeadNote,
  PackageDefinition,
  Payment,
  RenewalCandidate,
  RevenueReport,
  RosterEntry,
  SessionLedgerEntry,
  StudentDetail,
  StudentSummary,
  TrainerDetail,
  TrainerReport,
} from "~/lib/api/types";

export const DEMO_STUDENTS: StudentSummary[] = [
  {
    id: "s-01",
    fullName: "Học viên Demo 01",
    phone: "0900 000 001",
    status: "active",
    currentPackageName: "Gói Demo 10 buổi",
    sessionsRemaining: 4,
    expiryDate: "2026-09-30",
    renewalDue: true,
  },
  {
    id: "s-02",
    fullName: "Học viên Demo 02",
    phone: "0900 000 002",
    status: "active",
    currentPackageName: "Gói Demo 20 buổi",
    sessionsRemaining: 14,
    expiryDate: "2026-11-15",
    renewalDue: false,
  },
  {
    id: "s-03",
    fullName: "Học viên Demo 03",
    phone: "0900 000 003",
    status: "expiring",
    currentPackageName: "Gói Demo 10 buổi",
    sessionsRemaining: 2,
    expiryDate: "2026-08-28",
    renewalDue: true,
  },
  {
    id: "s-04",
    fullName: "Học viên Demo 04",
    phone: "0900 000 004",
    status: "expired",
    currentPackageName: "Gói Demo 10 buổi",
    sessionsRemaining: 0,
    expiryDate: "2026-07-31",
    renewalDue: false,
  },
  {
    id: "s-05",
    fullName: "Học viên Demo 05",
    phone: "0900 000 005",
    status: "active",
    currentPackageName: "Gói Demo riêng 8 buổi",
    sessionsRemaining: 6,
    expiryDate: "2026-10-20",
    renewalDue: false,
  },
  {
    id: "s-06",
    fullName: "Học viên Demo 06",
    phone: "0900 000 006",
    status: "inactive",
    currentPackageName: null,
    sessionsRemaining: null,
    expiryDate: null,
    renewalDue: false,
  },
];

const DEMO_HISTORY: BookingHistoryEntry[] = [
  {
    id: "bh-1",
    status: "attended",
    classTitle: "Reformer Flow",
    classType: "group",
    trainerName: "HLV Demo A",
    startsAt: "2026-08-14T06:30:00+07:00",
    sessionsCharged: 1,
    cancelledAt: null,
    refunded: null,
  },
  {
    id: "bh-2",
    status: "attended",
    classTitle: "Reformer Cơ bản",
    classType: "group",
    trainerName: "HLV Demo B",
    startsAt: "2026-08-12T08:00:00+07:00",
    sessionsCharged: 1,
    cancelledAt: null,
    refunded: null,
  },
  {
    id: "bh-3",
    status: "cancelled",
    classTitle: "Reformer Chiều",
    classType: "group",
    trainerName: "HLV Demo A",
    startsAt: "2026-08-10T18:30:00+07:00",
    sessionsCharged: 0,
    cancelledAt: "2026-08-10T09:00:00+07:00",
    refunded: true,
  },
  {
    id: "bh-4",
    status: "no_show",
    classTitle: "Private",
    classType: "private",
    trainerName: "HLV Demo A",
    startsAt: "2026-08-07T17:30:00+07:00",
    sessionsCharged: 1,
    cancelledAt: null,
    refunded: null,
  },
];

export const DEMO_PAYMENTS: Payment[] = [
  {
    id: "p-01",
    studentId: "s-01",
    studentName: "Học viên Demo 01",
    amount: 4250000,
    method: "transfer",
    status: "confirmed",
    reference: "Gói Demo 10 buổi",
    recordedBy: "Nhân viên Demo",
    recordedAt: "2026-07-01T10:12:00+07:00",
    voidReason: null,
  },
  {
    id: "p-02",
    studentId: "s-02",
    studentName: "Học viên Demo 02",
    amount: 8000000,
    method: "transfer",
    status: "confirmed",
    reference: "Gói Demo 20 buổi",
    recordedBy: "Nhân viên Demo",
    recordedAt: "2026-07-08T15:40:00+07:00",
    voidReason: null,
  },
  {
    id: "p-03",
    studentId: "s-05",
    studentName: "Học viên Demo 05",
    amount: 6400000,
    method: "cash",
    status: "confirmed",
    reference: "Gói Demo riêng 8 buổi",
    recordedBy: "Nhân viên Demo",
    recordedAt: "2026-08-02T09:05:00+07:00",
    voidReason: null,
  },
  {
    id: "p-04",
    studentId: "s-03",
    studentName: "Học viên Demo 03",
    amount: 4250000,
    method: "cash",
    status: "pending",
    reference: "Gia hạn Gói Demo 10 buổi",
    recordedBy: "Nhân viên Demo",
    recordedAt: "2026-08-19T18:20:00+07:00",
    voidReason: null,
  },
  {
    id: "p-05",
    studentId: "s-04",
    studentName: "Học viên Demo 04",
    amount: 500000,
    method: "cash",
    status: "void",
    reference: "Buổi lẻ — ghi nhận sai",
    recordedBy: "Nhân viên Demo",
    recordedAt: "2026-07-22T11:00:00+07:00",
    voidReason: "Ghi trùng, đã ghi lại ở phiếu khác",
  },
];

export const DEMO_PACKAGE_DEFINITIONS: PackageDefinition[] = [
  {
    id: "pd-01",
    name: "Gói Demo 10 buổi",
    sessions: 10,
    validityDays: 90,
    price: 4250000,
    allowedClassTypes: ["group"],
    onSale: true,
  },
  {
    id: "pd-02",
    name: "Gói Demo 20 buổi",
    sessions: 20,
    validityDays: 120,
    price: 8000000,
    allowedClassTypes: ["group"],
    onSale: true,
  },
  {
    id: "pd-03",
    name: "Gói Demo riêng 8 buổi",
    sessions: 8,
    validityDays: 90,
    price: 6400000,
    allowedClassTypes: ["private"],
    onSale: true,
  },
  {
    id: "pd-04",
    name: "Gói Demo thử 1 buổi",
    sessions: 1,
    validityDays: 14,
    price: 500000,
    allowedClassTypes: ["group", "private"],
    onSale: false,
  },
];

export const DEMO_LEADS: Lead[] = [
  {
    id: "l-01",
    fullName: "Khách Demo 01",
    phone: "0911 000 001",
    source: "website",
    need: "Đau lưng dưới khi ngồi lâu",
    preferredClassType: "group",
    status: "new",
    createdAt: "2026-08-20T09:14:00+07:00",
    lastContactedAt: null,
    followUpAt: null,
  },
  {
    id: "l-02",
    fullName: "Khách Demo 02",
    phone: "0911 000 002",
    source: "website",
    need: "Mới sinh, muốn tập lại từ đầu",
    preferredClassType: "private",
    status: "contacted",
    createdAt: "2026-08-18T14:02:00+07:00",
    lastContactedAt: "2026-08-19T10:30:00+07:00",
    followUpAt: "2026-08-23T10:00:00+07:00",
  },
  {
    id: "l-03",
    fullName: "Khách Demo 03",
    phone: "0911 000 003",
    source: "zalo",
    need: "Phục hồi sau chấn thương đầu gối",
    preferredClassType: "private",
    status: "scheduled",
    createdAt: "2026-08-15T20:41:00+07:00",
    lastContactedAt: "2026-08-16T09:00:00+07:00",
    followUpAt: "2026-08-22T17:30:00+07:00",
  },
  {
    id: "l-04",
    fullName: "Khách Demo 04",
    phone: "0911 000 004",
    source: "website",
    need: "Muốn tập đều 3 buổi/tuần",
    preferredClassType: null,
    status: "converted",
    createdAt: "2026-07-30T08:00:00+07:00",
    lastContactedAt: "2026-07-31T09:00:00+07:00",
    followUpAt: null,
  },
  {
    id: "l-05",
    fullName: "Khách Demo 05",
    phone: "0911 000 005",
    source: "walk-in",
    need: "Hỏi giá, chưa quyết định",
    preferredClassType: "group",
    status: "lost",
    createdAt: "2026-07-12T16:20:00+07:00",
    lastContactedAt: "2026-07-14T10:00:00+07:00",
    followUpAt: null,
  },
];

export const DEMO_RENEWALS: RenewalCandidate[] = [
  {
    studentId: "s-01",
    fullName: "Học viên Demo 01",
    phone: "0900 000 001",
    packageName: "Gói Demo 10 buổi",
    sessionsRemaining: 4,
    expiryDate: "2026-09-30",
    reason: "sessions_low",
    lastContactedAt: null,
    followUpAt: null,
  },
  {
    studentId: "s-03",
    fullName: "Học viên Demo 03",
    phone: "0900 000 003",
    packageName: "Gói Demo 10 buổi",
    sessionsRemaining: 2,
    expiryDate: "2026-08-28",
    reason: "both",
    lastContactedAt: "2026-08-18T11:00:00+07:00",
    followUpAt: "2026-08-22T11:00:00+07:00",
  },
];

export const DEMO_ACCOUNTS: AccountRow[] = [
  {
    id: "u-01",
    fullName: "Nhân viên Demo",
    identifier: "0258 000 000",
    role: "staff",
    status: "active",
    lastSignInAt: "2026-08-21T07:40:00+07:00",
  },
  {
    id: "u-02",
    fullName: "Chủ studio Demo",
    identifier: "0258 000 001",
    role: "owner",
    status: "active",
    lastSignInAt: "2026-08-20T19:10:00+07:00",
  },
  {
    id: "u-03",
    fullName: "HLV Demo A",
    identifier: "0900 100 001",
    role: "trainer",
    status: "active",
    lastSignInAt: "2026-08-21T06:05:00+07:00",
  },
  {
    id: "u-04",
    fullName: "HLV Demo B",
    identifier: "0900 100 002",
    role: "trainer",
    status: "locked",
    lastSignInAt: "2026-08-02T06:10:00+07:00",
  },
  {
    id: "u-05",
    fullName: "Học viên Demo 01",
    identifier: "0900 000 001",
    role: "student",
    status: "active",
    lastSignInAt: "2026-08-20T21:33:00+07:00",
  },
];

/**
 * Takes the summary rather than an id: the handler owns the mutable list, so a
 * student created during the session must resolve here too. Looking the id up
 * against the seed array again is how a newly created record 404s on its own
 * detail page.
 */
export function buildStudentDetail(
  base: StudentSummary,
  record: {
    joinedAt: string;
    email: string | null;
    note: string | null;
    /** The live payment log, so a receipt written this session shows up here. */
    payments: Payment[];
  },
): StudentDetail {
  const seeded = DEMO_STUDENTS.some((s) => s.id === base.id);
  return {
    ...base,
    email: record.email,
    note: record.note,
    // Taken from the record, not a constant: a student created a minute ago was
    // reporting the same join date as the seed roster.
    joinedAt: record.joinedAt,
    packages: seeded
      ? [
          {
            ...DEMO_PACKAGE,
            // The roster row is the live number, so the package on the profile
            // must not carry the frozen fixture one beside it.
            sessionsRemaining: base.sessionsRemaining ?? 0,
            renewalDue: base.renewalDue,
          },
        ]
      : [],
    payments: record.payments.filter((p) => p.studentId === base.id),
    classHistory: seeded ? DEMO_HISTORY : [],
  };
}

/** The join date the seed roster ships with. */
export const DEMO_JOINED_AT = "2026-06-18";

/**
 * Takes the live lead record and its notes rather than looking either up in the
 * fixture, so a logged outcome or a conversion is visible on the next read.
 */
export function buildLeadDetail(
  base: Lead,
  notes: LeadNote[],
  convertedStudentId: string | null,
): LeadDetail {
  return { ...base, convertedStudentId, notes };
}

/** The one seeded note, for leads that were already contacted before the demo. */
export function seedLeadNotes(lead: Lead): LeadNote[] {
  if (lead.lastContactedAt === null) return [];
  return [
    {
      id: `${lead.id}-n1`,
      body: "Đã gọi, khách hẹn gọi lại cuối tuần.",
      actorName: "Nhân viên Demo",
      createdAt: lead.lastContactedAt,
    },
  ];
}

export function buildTrainerDetail(id: string): TrainerDetail | undefined {
  const base = DEMO_TRAINERS.find((t) => t.id === id);
  if (!base) return undefined;
  return {
    ...base,
    phone: null,
    email: null,
    joinedAt: "2026-05-02",
    monthlyClassCount: 34,
    monthlyStudentCount: 21,
  };
}

/**
 * The starting roster for a demo class, as a flat list of real booking records.
 *
 * It used to return two arrays derived from a count, which meant a roster row was
 * not a thing that could be cancelled or moved — and staff acting for a student is
 * precisely cancelling and moving individual rows.
 */
export function seedRoster(bookedCount: number, waitlistCount: number): RosterEntry[] {
  const make = (
    index: number,
    status: RosterEntry["status"],
    position: number | null,
  ): RosterEntry => ({
    bookingId: `b-${status}-${index}`,
    studentId: DEMO_STUDENTS[index % DEMO_STUDENTS.length]!.id,
    fullName: DEMO_STUDENTS[index % DEMO_STUDENTS.length]!.fullName,
    phone: DEMO_STUDENTS[index % DEMO_STUDENTS.length]!.phone,
    status,
    bookedAt: "2026-08-19T09:00:00+07:00",
    waitlistPosition: position,
    sessionsCharged: status === "waitlisted" ? 0 : 1,
  });
  return [
    ...Array.from({ length: bookedCount }, (_, i) => make(i, "booked", null)),
    ...Array.from({ length: waitlistCount }, (_, i) =>
      make(i + bookedCount, "waitlisted", i + 1),
    ),
  ];
}

export function buildRevenueReport(
  from: string,
  to: string,
  ledger: Payment[],
): RevenueReport {
  const confirmed = ledger.filter(
    (p) =>
      p.status === "confirmed" &&
      p.recordedAt.slice(0, 10) >= from &&
      p.recordedAt.slice(0, 10) <= to,
  );
  const total = confirmed.reduce((sum, p) => sum + p.amount, 0);
  return {
    range: { from, to },
    total,
    transactionCount: confirmed.length,
    byMethod: (["cash", "transfer"] as const).map((method) => {
      const rows = confirmed.filter((p) => p.method === method);
      return { method, total: rows.reduce((s, p) => s + p.amount, 0), count: rows.length };
    }),
    byDay: confirmed.map((p) => ({ date: p.recordedAt.slice(0, 10), total: p.amount })),
  };
}

export function buildClassReport(
  from: string,
  to: string,
  classes: ReturnType<typeof buildDemoClasses>,
): ClassReport {
  const inRange = classes.filter(
    (c) => c.startsAt.slice(0, 10) >= from && c.startsAt.slice(0, 10) <= to,
  );
  const byType = (["group", "private"] as const).map((type) => {
    const rows = inRange.filter((c) => c.type === type);
    return {
      type,
      classCount: rows.length,
      bookingCount: rows.reduce((s, c) => s + c.bookedCount, 0),
      capacity: rows.reduce((s, c) => s + c.capacity, 0),
    };
  });
  const days = new Map<string, { classCount: number; bookingCount: number }>();
  for (const c of inRange) {
    const key = c.startsAt.slice(0, 10);
    const prev = days.get(key) ?? { classCount: 0, bookingCount: 0 };
    days.set(key, {
      classCount: prev.classCount + 1,
      bookingCount: prev.bookingCount + c.bookedCount,
    });
  }
  return {
    range: { from, to },
    classCount: inRange.length,
    bookingCount: inRange.reduce((s, c) => s + c.bookedCount, 0),
    capacityTotal: inRange.reduce((s, c) => s + c.capacity, 0),
    byType,
    byDay: [...days.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function buildTrainerReport(
  from: string,
  to: string,
  classes: ReturnType<typeof buildDemoClasses>,
): TrainerReport {
  const inRange = classes.filter(
    (c) => c.startsAt.slice(0, 10) >= from && c.startsAt.slice(0, 10) <= to,
  );
  return {
    range: { from, to },
    rows: DEMO_TRAINERS.map((t) => {
      const rows = inRange.filter((c) => c.trainer.id === t.id);
      return {
        trainerId: t.id,
        fullName: t.fullName,
        classCount: rows.length,
        bookingCount: rows.reduce((s, c) => s + c.bookedCount, 0),
        capacityTotal: rows.reduce((s, c) => s + c.capacity, 0),
      };
    }),
  };
}

/**
 * The seed ledger for the demo package. Its deltas sum to
 * `DEMO_PACKAGE.sessionsRemaining` on purpose — the screen exists to make that
 * identity checkable, so a fixture that violated it would be testing nothing.
 */
export function seedLedger(studentPackageId: string): SessionLedgerEntry[] {
  return [
    {
      id: `${studentPackageId}-1`,
      studentPackageId,
      delta: 10,
      reason: "Mua gói",
      refType: "purchase",
      refId: "p-01",
      actorName: "Nhân viên Demo",
      createdAt: "2026-07-01T10:12:00+07:00",
    },
    {
      id: `${studentPackageId}-2`,
      studentPackageId,
      delta: -1,
      reason: "Đặt lớp Reformer Flow",
      refType: "booking",
      refId: "b-1",
      actorName: "Học viên Demo 01",
      createdAt: "2026-08-12T07:55:00+07:00",
    },
    {
      id: `${studentPackageId}-3`,
      studentPackageId,
      delta: 1,
      reason: "Hủy đúng hạn",
      refType: "cancellation",
      refId: "b-3",
      actorName: "Học viên Demo 01",
      createdAt: "2026-08-10T09:00:00+07:00",
    },
    {
      id: `${studentPackageId}-4`,
      studentPackageId,
      delta: -1,
      reason: "Đặt lớp Reformer Cơ bản",
      refType: "booking",
      refId: "b-2",
      actorName: "Học viên Demo 01",
      createdAt: "2026-08-11T20:14:00+07:00",
    },
    {
      id: `${studentPackageId}-5`,
      studentPackageId,
      delta: -1,
      reason: "Điều chỉnh thủ công — vắng không báo",
      refType: "manual",
      refId: null,
      actorName: "Nhân viên Demo",
      createdAt: "2026-08-07T19:00:00+07:00",
    },
    {
      id: `${studentPackageId}-6`,
      studentPackageId,
      delta: -4,
      reason: "Đặt lớp các buổi còn lại",
      refType: "booking",
      refId: "b-x",
      actorName: "Học viên Demo 01",
      createdAt: "2026-08-15T09:00:00+07:00",
    },
  ];
}
