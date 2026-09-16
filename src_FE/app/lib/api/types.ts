/**
 * API CONTRACT
 *
 * These types describe what the authoritative backend returns. They are not a
 * place to encode business rules — see docs/BUSINESS_RULES.md. Anything the
 * frontend cannot compute safely (eligibility, refundability, waitlist
 * promotion) arrives here as backend-decided data.
 *
 * Every entity below traces to a row in
 * docs/source/Pilates_Danh_Sach_Chuc_Nang_Va_Cau_Hoi_Xac_Nhan.xlsx.
 */

/** ISO-8601 timestamp with offset, e.g. "2026-08-18T06:30:00+07:00". */
export type IsoDateTime = string;
/** ISO-8601 calendar date, e.g. "2026-08-18". */
export type IsoDate = string;

export type Role = "student" | "trainer" | "staff" | "owner";

/** CONFIRMED (Phạm vi xác nhận, Q3): Group and Private only. No Duo. */
export type ClassType = "group" | "private";

export type ClassSessionStatus = "scheduled" | "cancelled" | "completed";

export interface Trainer {
  id: string;
  fullName: string;
  /** Short public-facing line. Studio-supplied; may be null until provided. */
  headline: string | null;
  specialties: string[];
  photoUrl: string | null;
  active: boolean;
  /** Whether this trainer is published on the public site. */
  publicProfile: boolean;
}

/**
 * A class as the studio describes one.
 *
 * Deliberately a local date, a wall-clock start and a duration rather than two
 * instants. The studio thinks in "thứ Ba, 6:30, 50 phút"; making the browser
 * compose `+07:00` instants means the frontend owns a timezone calculation, and
 * that is precisely the calculation that goes wrong twice a year in other
 * products. The backend composes the instant.
 */
export interface ClassInput {
  title: string;
  type: ClassType;
  trainerId: string;
  /** Studio-local date, `YYYY-MM-DD`. */
  date: IsoDate;
  /** Studio-local start, `HH:MM`, 24-hour. */
  startTime: string;
  durationMinutes: number;
  capacity: number;
  room: string | null;
  note: string | null;
}

/**
 * A weekly pattern. The first occurrence is `ClassInput.date`; the pattern then
 * repeats on `weekdays` until `repeatUntil`, inclusive.
 */
export interface RecurringClassInput extends ClassInput {
  /** ISO weekday numbers, 1 = Monday … 7 = Sunday. At least one. */
  weekdays: number[];
  repeatUntil: IsoDate;
}

/** One occurrence the pattern could not create, and what stood in the way. */
export interface SkippedOccurrence {
  date: IsoDate;
  conflict: TrainerConflict;
}

/**
 * Partial success is the honest outcome here.
 *
 * A twelve-week pattern that collides once should not be refused entirely, and it
 * must not quietly create eleven classes either. So the backend creates what it
 * can and returns what it skipped — the screen is then obliged to show both.
 */
export interface RecurringClassResult {
  created: ClassSession[];
  skipped: SkippedOccurrence[];
}

/**
 * Cancelling a class the studio scheduled. The reason is not bookkeeping — it is
 * what staff will tell the students who were booked.
 */
export interface ClassCancellationInput {
  reason: string;
}

/**
 * The class already occupying a trainer at that time.
 *
 * CONFIRMED (Q4): one trainer per class, and reassignment must not double-book a
 * trainer. So the backend refuses, and it names what it collided with — "trùng
 * lịch" with no second class is an error message that cannot be acted on.
 */
export interface TrainerConflict {
  classId: string;
  title: string;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  trainerName: string;
}

export interface ClassSession {
  id: string;
  type: ClassType;
  title: string;
  trainer: Pick<Trainer, "id" | "fullName" | "photoUrl">;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  /** CONFIRMED (Q4): exactly one trainer per class. */
  capacity: number;
  bookedCount: number;
  waitlistCount: number;
  status: ClassSessionStatus;
  room: string | null;
  note: string | null;
  /**
   * Why the studio cancelled this buổi. Separate from `note` on purpose: writing
   * the reason into the note destroys whatever the studio had written about the
   * class, and leaves a reader unable to tell the two apart. `null` unless
   * `status` is `cancelled`.
   */
  cancellationReason: string | null;
}

/**
 * Why a student may or may not book. The backend decides; the frontend only
 * renders. Unknown codes must degrade to a generic message rather than being
 * silently dropped — see `app/features/booking/eligibility-copy.ts`.
 */
export type EligibilityCode =
  | "ok"
  | "no_active_package"
  | "package_expired"
  | "no_sessions_remaining"
  | "class_full"
  | "class_cancelled"
  | "already_booked"
  | "booking_closed"
  | "package_class_type_mismatch"
  | "schedule_conflict";

export interface BookingEligibility {
  canBook: boolean;
  canJoinWaitlist: boolean;
  reasons: EligibilityCode[];
  /** Sessions this booking would deduct, as calculated by the backend. */
  sessionCost: number | null;
}

export type BookingStatus = "booked" | "waitlisted" | "attended" | "cancelled" | "no_show";

/**
 * Backend-computed cancellation terms for one booking.
 * CONFIRMED (Q6): refund window is 4h for group, 8h for private — but the
 * frontend renders `policyHours`/`deadlineAt` as returned, never its own
 * arithmetic, so a studio policy change needs no frontend release.
 */
export interface CancellationTerms {
  cancellable: boolean;
  /** True => cancelling before `deadlineAt` returns the deducted session. */
  refundable: boolean;
  deadlineAt: IsoDateTime | null;
  policyHours: number | null;
}

export interface Booking {
  id: string;
  status: BookingStatus;
  bookedAt: IsoDateTime;
  classSession: ClassSession;
  /** Null while the class is in the past or the booking is already closed. */
  cancellation: CancellationTerms | null;
  /** Position in the waitlist queue, 1-based. Null unless status is waitlisted. */
  waitlistPosition: number | null;
  /**
   * OPEN QUESTION (Q7): whether a freed slot auto-promotes the first person in
   * the queue or waits for staff confirmation is not yet confirmed by the
   * studio. Backend reports it; UI copy branches on it and stays neutral when
   * it is null. See docs/OPEN_QUESTIONS.md.
   */
  waitlistAutoPromote: boolean | null;
  sessionsCharged: number;
}

export type StudentPackageStatus = "active" | "expired" | "used_up" | "suspended";

export interface StudentPackage {
  id: string;
  packageName: string;
  /** Which class types this package may be spent on. */
  allowedClassTypes: ClassType[];
  sessionsTotal: number;
  /** Authoritative balance. Equals the sum of the session ledger. */
  sessionsRemaining: number;
  startDate: IsoDate;
  expiryDate: IsoDate;
  status: StudentPackageStatus;
  /** CONFIRMED: renewal is flagged at 6 sessions or 15 days remaining. */
  renewalDue: boolean;
}

/**
 * One package's ledger, with the context the screen needs to name what it is
 * showing. Previously the screen received bare entries and printed the raw
 * package id at the reader, because it had nothing else to print.
 */
export interface SessionLedger {
  studentPackageId: string;
  studentId: string;
  studentName: string;
  packageName: string;
  /** Authoritative. Equals the sum of every entry's delta. */
  sessionsRemaining: number;
  entries: SessionLedgerEntry[];
}

/** A manual adjustment. The reason is required by the business rules, not by taste. */
export interface SessionAdjustmentInput {
  /** Signed and non-zero. */
  delta: number;
  reason: string;
}

export interface SessionLedgerEntry {
  id: string;
  studentPackageId: string;
  /** Signed. Balance is the sum of every delta — never stored separately. */
  delta: number;
  reason: string;
  refType: "booking" | "cancellation" | "purchase" | "manual" | "expiry";
  refId: string | null;
  actorName: string;
  createdAt: IsoDateTime;
}

/** Staff booking a student in. Q5: staff and trainers may act for a student. */
export interface StaffBookingInput {
  classId: string;
  studentId: string;
}

/** Moving an existing booking to another buổi. Used by staff and by students. */
export interface RescheduleInput {
  classId: string;
}

/**
 * A buổi a booking may move to, as the backend judges it.
 *
 * The frontend does not decide what is eligible — it lists what it is given. A
 * class that is full, cancelled or already started never appears here.
 */
export interface RescheduleOption {
  classId: string;
  title: string;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  trainerName: string;
  capacity: number;
  bookedCount: number;
}

export interface SessionUser {
  id: string;
  fullName: string;
  role: Role;
  phone: string | null;
  email: string | null;
}

export interface ConsultationRequest {
  fullName: string;
  phone: string;
  /** Free-text goal / need, as captured by the public consultation form. */
  need: string;
  preferredClassType: ClassType | null;
  source: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Public schedule entry — deliberately narrower than the authenticated one. */
export interface PublicClassSession {
  id: string;
  type: ClassType;
  title: string;
  /**
   * Null until the studio has published this trainer's profile. A person's name
   * is the most trust-bearing fact on the site, so it is never filled with a
   * stand-in — a placeholder shaped like content is worse than a visible gap,
   * because nothing signals it is wrong.
   */
  trainerName: string | null;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  /** Backend decides how much availability detail is public. */
  availability: "open" | "few_left" | "full";
}

/* ══════════════════════════════════════════════════════════════════════════
   STUDIO OPERATIONS
   Added for functional parity with the capability surface in docs/PRODUCT.md
   §3–§9. Every shape below is a contract the backend owns; nothing here
   encodes a business rule (docs/BUSINESS_RULES.md).
   ══════════════════════════════════════════════════════════════════════════ */

export type StudentStatus = "active" | "expiring" | "expired" | "inactive";

export interface StudentSummary {
  id: string;
  fullName: string;
  phone: string;
  status: StudentStatus;
  /** Null when the student has never held a package. */
  currentPackageName: string | null;
  sessionsRemaining: number | null;
  expiryDate: IsoDate | null;
  /** Backend-flagged: 6 sessions or 15 days remaining. */
  renewalDue: boolean;
}

export interface StudentDetail extends StudentSummary {
  email: string | null;
  note: string | null;
  joinedAt: IsoDate;
  packages: StudentPackage[];
  payments: Payment[];
  /** Most recent first. */
  classHistory: BookingHistoryEntry[];
}

export interface BookingHistoryEntry {
  id: string;
  status: BookingStatus;
  classTitle: string;
  classType: ClassType;
  trainerName: string;
  startsAt: IsoDateTime;
  sessionsCharged: number;
  /** Present when the booking was cancelled. */
  cancelledAt: IsoDateTime | null;
  refunded: boolean | null;
}

export type PaymentMethod = "cash" | "transfer";
export type PaymentStatus = "pending" | "confirmed" | "void";

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  /** What the payment bought, as recorded by staff. */
  reference: string;
  recordedBy: string;
  recordedAt: IsoDateTime;
  /**
   * Why the record was voided. A money record that was reversed without a stated
   * reason is not an audit trail — the same standard the session ledger already
   * holds. `null` on any record that is not void.
   */
  voidReason: string | null;
}

/**
 * A payment as staff record it. Deliberately carries no package reference: the
 * studio has not confirmed its packages or prices, so `reference` is what staff
 * write down and `amount` is what they were handed. When prices are confirmed,
 * a package sale becomes a separate transaction that produces one of these.
 */
export interface PaymentInput {
  studentId: string;
  /** Whole đồng. VND has no minor unit. */
  amount: number;
  method: PaymentMethod;
  /** Recorded straight away as confirmed (cash in hand) or pending (claimed transfer). */
  status: Extract<PaymentStatus, "confirmed" | "pending">;
  reference: string;
}

export interface PackageDefinition {
  id: string;
  name: string;
  sessions: number;
  /** Validity in days from the start date. */
  validityDays: number;
  price: number;
  allowedClassTypes: ClassType[];
  onSale: boolean;
}

export type LeadStatus = "new" | "contacted" | "scheduled" | "converted" | "lost";

export interface Lead {
  id: string;
  fullName: string;
  phone: string;
  source: string;
  need: string;
  preferredClassType: ClassType | null;
  status: LeadStatus;
  createdAt: IsoDateTime;
  /** Set once staff have logged an outcome. */
  lastContactedAt: IsoDateTime | null;
  followUpAt: IsoDateTime | null;
}

export interface LeadNote {
  id: string;
  body: string;
  actorName: string;
  createdAt: IsoDateTime;
}

export interface LeadDetail extends Lead {
  notes: LeadNote[];
  /** Set when this lead became a student. */
  convertedStudentId: string | null;
}

export interface RenewalCandidate {
  studentId: string;
  fullName: string;
  phone: string;
  packageName: string;
  sessionsRemaining: number;
  expiryDate: IsoDate;
  /** Which threshold triggered the flag. */
  reason: "sessions_low" | "expiring_soon" | "both";
  lastContactedAt: IsoDateTime | null;
  followUpAt: IsoDateTime | null;
}

/** One person on a class roster, as staff and trainers see it. */
export interface RosterEntry {
  bookingId: string;
  studentId: string;
  fullName: string;
  phone: string | null;
  status: BookingStatus;
  bookedAt: IsoDateTime;
  waitlistPosition: number | null;
  sessionsCharged: number;
}

export interface ClassRoster {
  classSession: ClassSession;
  booked: RosterEntry[];
  waitlist: RosterEntry[];
}

export interface TrainerDetail extends Trainer {
  phone: string | null;
  email: string | null;
  joinedAt: IsoDate;
  /** Rolling month, computed by the backend. */
  monthlyClassCount: number;
  monthlyStudentCount: number;
}

/**
 * A new account, as staff create one.
 *
 * No password field, and there never will be one here: the studio does not choose
 * a person's password. The backend sends an invitation and the person sets their
 * own — the same reason "forgot password" answers identically whether or not the
 * account exists.
 */
export interface AccountInput {
  fullName: string;
  /** Phone number; the studio identifies people by phone. */
  identifier: string;
  role: Role;
}

export interface AccountRow {
  id: string;
  fullName: string;
  identifier: string;
  role: Role;
  status: "active" | "locked";
  lastSignInAt: IsoDateTime | null;
}

/* ── Reports. Read-only aggregates; the backend does the arithmetic. ─────── */

export interface ReportRange {
  from: IsoDate;
  to: IsoDate;
}

export interface RevenueReport {
  range: ReportRange;
  /** Confirmed transactions only. */
  total: number;
  byMethod: Array<{ method: PaymentMethod; total: number; count: number }>;
  byDay: Array<{ date: IsoDate; total: number }>;
  transactionCount: number;
}

export interface ClassReport {
  range: ReportRange;
  classCount: number;
  bookingCount: number;
  capacityTotal: number;
  byType: Array<{
    type: ClassType;
    classCount: number;
    bookingCount: number;
    capacity: number;
  }>;
  byDay: Array<{ date: IsoDate; classCount: number; bookingCount: number }>;
}

export interface TrainerReportRow {
  trainerId: string;
  fullName: string;
  classCount: number;
  bookingCount: number;
  capacityTotal: number;
}

export interface TrainerReport {
  range: ReportRange;
  rows: TrainerReportRow[];
}

/* ── Writes. Phase 6: the studio can finally enter data. ─────────────────── */

/**
 * What staff type when they create or edit a student.
 *
 * `phone` is the studio's real identifier for a person, which is why the
 * function list calls for a duplicate check on it. That check is the backend's:
 * it answers `409 phone_taken` and the frontend renders it against the field.
 */
export interface StudentInput {
  fullName: string;
  phone: string;
  email: string | null;
  note: string | null;
}

/**
 * Converting a lead keeps the consultation history and does not retype the
 * data — that pairing is the confirmed requirement, so the payload carries only
 * what staff may correct on the way through.
 */
export interface LeadConversionInput {
  fullName: string;
  phone: string;
  email: string | null;
  note: string | null;
}

export interface LeadConversionResult {
  studentId: string;
  lead: Lead;
}
