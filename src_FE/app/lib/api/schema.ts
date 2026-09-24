/**
 * THE BACKEND CONTRACT, 1:1.
 *
 * Field names, casing, id types and enum spellings are the backend's, not
 * ours. Renaming them here would create a second vocabulary to keep in sync,
 * and every page in `docs/api/` — the generated, test-pinned source of truth —
 * is written in the first one. See `docs/API_MAPPING.md`.
 *
 * Nothing in this file encodes a business rule. Decisions (`can_cancel`,
 * `seats_left`, `refund_if_cancelled_now`, `fill_rate`) arrive already made;
 * see rule 12 in AGENTS.md.
 */

/** ISO-8601 with offset, e.g. `"2026-09-14T06:00:00+07:00"`. */
export type IsoDateTime = string;
/** ISO-8601 calendar date, e.g. `"2026-09-14"`. */
export type IsoDate = string;
/** `"HH:MM:SS"` studio-local wall clock. */
export type IsoTime = string;

/**
 * A decimal carried as a string — `"1500000.00"`.
 *
 * Parsed at the formatter, never here. Turning it into a `number` at the
 * network edge is how a total picks up a `.9999999` tail.
 */
export type DecimalString = string;

/* ── Enums ──────────────────────────────────────────────────────────────── */

export type Role = "ADMIN" | "STAFF" | "TRAINER" | "STUDENT";
export type UserStatus = "ACTIVE" | "PENDING_ACTIVATION";
export type ClassType = "GROUP" | "PRIVATE";
export type SessionStatus = "SCHEDULED" | "CANCELLED";
export type BookingStatus =
  "BOOKED" | "CANCELLED_INTIME" | "CANCELLED_LATE" | "ATTENDED" | "NO_SHOW";
export type AttendanceStatus = Extract<BookingStatus, "ATTENDED" | "NO_SHOW">;
export type StudentStatus = "ACTIVE" | "INACTIVE";
export type StudentPackageStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";
export type PaymentMethod = "CASH" | "TRANSFER";
export type PaymentStatus = "PENDING" | "CONFIRMED" | "VOID";
export type LeadStatus = "NEW" | "CONTACTED" | "CONVERTED" | "LOST";
/** Leads may be moved to these by hand; `CONVERTED` is reached only by convert. */
export type LeadStatusPatch = Exclude<LeadStatus, "CONVERTED">;
export type LedgerReasonCode =
  | "PACKAGE_SOLD"
  | "PACKAGE_RENEWED"
  | "BOOKING_DEDUCT"
  | "CANCEL_REFUND"
  | "ADMIN_ADJUST"
  | "PAYMENT_VOID";
export type ExportFormat = "csv" | "xlsx";

/** The body of every business error: `{ detail: { code, message } }`. */
export interface ApiErrorDetail {
  code: string;
  /** Written for the end user, in Vietnamese. Show it; do not re-translate. */
  message: string;
}

/* ── Auth ───────────────────────────────────────────────────────────────── */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/**
 * The only source of the signed-in person's role and profile links.
 * Never read `student_id` / `trainer_id` out of the JWT payload.
 */
export interface MeResponse {
  id: number;
  email: string;
  full_name: string | null;
  phone?: string | null;
  role: Role;
  status: UserStatus;
  student_id?: number | null;
  trainer_id?: number | null;
}

export interface UpdateMeRequest {
  full_name?: string | null;
  phone?: string | null;
}

export interface MessageResponse {
  message: string;
}

/* ── Accounts ───────────────────────────────────────────────────────────── */

export interface AccountResponse {
  id: number;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: Role;
  status: UserStatus;
  is_active: boolean;
  created_at: IsoDateTime;
  student_id?: number | null;
  trainer_id?: number | null;
}

export type AccountListParams = {
  role?: Role;
  is_active?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
};

export interface AccountCreateRequest {
  email: string;
  full_name?: string | null;
  phone?: string | null;
  role: Role;
  /** Required when `role` is `STUDENT`: the profile this login belongs to. */
  student_id?: number | null;
  /** Omit to email the person a link and let them set their own. */
  password?: string | null;
}

/**
 * Rejects unknown fields with 422 — on purpose. Locking an account goes
 * through `POST /accounts/{id}/lock`, not `is_active` here.
 */
export interface AccountUpdateRequest {
  full_name?: string | null;
  phone?: string | null;
  role?: Role | null;
  student_id?: number | null;
}

/* ── Public site ────────────────────────────────────────────────────────── */

export interface PublicAnnouncement {
  title: string;
  body: string;
  publish_at?: IsoDateTime | null;
}

export interface PublicPackage {
  name: string;
  /** `null` until the studio supplies a price. Render a labelled gap, not 0. */
  price?: DecimalString | null;
  credits: number;
  duration_days: number;
  class_type: ClassType;
}

/** `is_full` is a boolean on purpose: seats left would say who is alone. */
export interface PublicClassSession {
  starts_at: IsoDateTime;
  ends_at: IsoDateTime;
  class_type: ClassType;
  trainer_name: string;
  is_full: boolean;
}

export interface PublicTrainer {
  full_name: string;
  photo_key?: string | null;
  bio?: string | null;
}

export interface PublicLeadRequest {
  full_name: string;
  phone: string;
  need?: string | null;
  source?: string | null;
}

/* ── Leads ──────────────────────────────────────────────────────────────── */

export interface LeadResponse {
  id: number;
  full_name: string;
  phone: string;
  need: string | null;
  source: string | null;
  status: LeadStatus;
  assigned_to: number | null;
  converted_student_id: number | null;
  created_at: IsoDateTime;
}

export type LeadListParams = {
  status?: LeadStatus;
  source?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

export interface LeadUpdateRequest {
  status?: LeadStatusPatch | null;
  need?: string | null;
  assigned_to?: number | null;
}

/* ── Students ───────────────────────────────────────────────────────────── */

export interface StudentResponse {
  id: number;
  /** Set once this profile has a login attached. */
  user_id: number | null;
  full_name: string;
  phone: string;
  email: string | null;
  dob: IsoDate | null;
  note: string | null;
  status: StudentStatus;
  created_at: IsoDateTime;
}

export type StudentListParams = {
  status?: StudentStatus;
  q?: string;
  limit?: number;
  offset?: number;
};

export interface StudentCreateRequest {
  full_name: string;
  /** The studio's identity key. Duplicates are refused with 409. */
  phone: string;
  email?: string | null;
  dob?: IsoDate | null;
  note?: string | null;
}

export interface StudentUpdateRequest {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  dob?: IsoDate | null;
  note?: string | null;
  status?: StudentStatus | null;
}

export interface PackageSummary {
  id: number;
  name: string;
  class_type: ClassType;
  price: DecimalString;
  start_date: IsoDate;
  end_date: IsoDate;
  credits_remaining: number;
  days_remaining: number;
}

/** Credits counted from the ledger, active packages only. */
export interface StudentOverviewResponse {
  student: StudentResponse;
  credits_remaining: number;
  active_packages: PackageSummary[];
  needs_renewal: boolean;
}

/* ── Progress photos ────────────────────────────────────────────────────── */

export interface ProgressPhotoResponse {
  id: number;
  student_id: number;
  taken_at: IsoDateTime;
  uploaded_by: number;
  created_at: IsoDateTime;
}

/* ── Trainers ───────────────────────────────────────────────────────────── */

export interface TrainerResponse {
  id: number;
  full_name: string;
  phone: string | null;
  bio: string | null;
  specialties: string | null;
  photo_key: string | null;
  /** Published on the public site. A trainer cannot set this on themselves. */
  is_public: boolean;
  is_active: boolean;
  user_id: number | null;
  created_at: IsoDateTime;
}

export type TrainerListParams = {
  is_active?: boolean;
  is_public?: boolean;
  limit?: number;
  offset?: number;
};

export interface TrainerCreateRequest {
  full_name: string;
  phone?: string | null;
  bio?: string | null;
  specialties?: string | null;
  is_public?: boolean;
  user_id?: number | null;
}

export interface TrainerUpdateRequest {
  full_name?: string | null;
  phone?: string | null;
  bio?: string | null;
  specialties?: string | null;
  is_public?: boolean | null;
  is_active?: boolean | null;
  user_id?: number | null;
}

/* ── Announcements ──────────────────────────────────────────────────────── */

export interface AnnouncementResponse {
  id: number;
  title: string;
  body: string;
  is_published: boolean;
  publish_at: IsoDateTime | null;
  created_by: number;
  created_at: IsoDateTime;
  updated_at: IsoDateTime | null;
  updated_by: number | null;
}

export type AnnouncementListParams = {
  is_published?: boolean;
  limit?: number;
  offset?: number;
};

export interface AnnouncementCreateRequest {
  title: string;
  body: string;
  is_published?: boolean;
  publish_at?: IsoDateTime | null;
}

export interface AnnouncementUpdateRequest {
  title?: string | null;
  body?: string | null;
  is_published?: boolean | null;
  publish_at?: IsoDateTime | null;
}

/* ── Packages, credit ledger ────────────────────────────────────────────── */

/** The catalogue. Distinct from `StudentPackageResponse`, which is a purchase. */
export interface PackageTypeResponse {
  id: number;
  name: string;
  price: DecimalString | null;
  credits: number;
  duration_days: number;
  class_type: ClassType;
  is_selling: boolean;
}

export type PackageTypeListParams = {
  class_type?: ClassType;
  is_selling?: boolean;
};

export interface PackageTypeCreateRequest {
  name: string;
  price?: DecimalString | number | null;
  credits: number;
  duration_days: number;
  class_type: ClassType;
  is_selling?: boolean;
}

/** Never touches packages already sold — those hold their own snapshot. */
export interface PackageTypeUpdateRequest {
  name?: string | null;
  price?: DecimalString | number | null;
  credits?: number | null;
  duration_days?: number | null;
  is_selling?: boolean | null;
}

/**
 * One package a student bought. The `*_snapshot` fields are frozen at the sale
 * so that re-pricing the catalogue cannot rewrite last month's revenue.
 */
export interface StudentPackageResponse {
  id: number;
  student_id: number;
  package_type_id: number | null;
  name_snapshot: string;
  price_snapshot: DecimalString;
  credits_snapshot: number;
  class_type_snapshot: ClassType;
  start_date: IsoDate;
  end_date: IsoDate;
  status: StudentPackageStatus;
  balance_cached: number;
  created_at: IsoDateTime;
}

export type StudentPackageListParams = {
  student_id?: number;
  limit?: number;
  offset?: number;
};

export interface SellPackageRequest {
  student_id: number;
  package_type_id: number;
  start_date?: IsoDate | null;
}

export interface RenewPackageRequest {
  extra_days?: number;
  extra_credits?: number;
  note?: string | null;
}

export interface AdjustCreditsRequest {
  /** Signed. Positive adds credits, negative removes them. */
  delta: number;
  /** Required by the business rule and by a database CHECK. */
  reason: string;
}

/** Read `balance_after`. Never sum `delta` in the client. */
export interface LedgerEntryResponse {
  id: number;
  delta: number;
  balance_after: number;
  reason_code: LedgerReasonCode;
  note: string | null;
  booking_id: number | null;
  actor_user_id: number;
  created_at: IsoDateTime;
}

export interface PackageLedgerResponse {
  student_package_id: number;
  entries: LedgerEntryResponse[];
  closing_balance: number;
}

/* ── Payments ───────────────────────────────────────────────────────────── */

export interface PaymentResponse {
  id: number;
  student_package_id: number;
  amount: DecimalString;
  method: PaymentMethod;
  status: PaymentStatus;
  note: string | null;
  recorded_by: number;
  recorded_at: IsoDateTime;
  confirmed_by: number | null;
  confirmed_at: IsoDateTime | null;
  voided_by: number | null;
  voided_at: IsoDateTime | null;
  void_reason: string | null;
}

export type PaymentListParams = {
  student_package_id?: number;
  student_id?: number;
  status?: PaymentStatus;
  limit?: number;
  offset?: number;
};

/** Credits were added when the package was sold — not by this record. */
export interface RecordPaymentRequest {
  student_package_id: number;
  amount: DecimalString | number;
  method: PaymentMethod;
  note?: string | null;
}

export interface VoidPaymentRequest {
  reason: string;
}

/* ── Classes & schedule ─────────────────────────────────────────────────── */

/** A session is a time, a trainer, a type and a capacity. No title, no room. */
export interface ClassSessionResponse {
  id: number;
  starts_at: IsoDateTime;
  ends_at: IsoDateTime;
  trainer_id: number;
  class_type: ClassType;
  capacity: number;
  status: SessionStatus;
  recurrence_id: string | null;
  cancel_reason: string | null;
}

/**
 * One response, two projections.
 *
 * Staff get the real occupancy. A **student gets `booked_count: 0` and
 * `seats_left` as 1 or 0** — has room, or does not — because a seat count is
 * enough to work out which 6am class has one person in it. Read them as a
 * boolean on a student surface, never as a number, and never print
 * `booked_count` to a student: it is not their count, it is a redaction.
 */
export interface ClassSessionDetailResponse extends ClassSessionResponse {
  booked_count: number;
  seats_left: number;
  trainer_name: string;
}

export type ClassListParams = {
  starts_from?: IsoDateTime;
  starts_to?: IsoDateTime;
  trainer_id?: number;
  class_type?: ClassType;
  status?: SessionStatus;
  limit?: number;
};

export interface ClassCreateRequest {
  starts_at: IsoDateTime;
  ends_at: IsoDateTime;
  trainer_id: number;
  class_type: ClassType;
  capacity?: number | null;
}

export interface RecurrenceRequest {
  start_date: IsoDate;
  end_date: IsoDate;
  /** ISO weekday numbers as the backend counts them. */
  weekdays: number[];
  start_time: IsoTime;
  duration_minutes: number;
  trainer_id: number;
  class_type: ClassType;
  capacity?: number | null;
}

export interface OccurrenceResponse {
  starts_at: IsoDateTime;
  ends_at: IsoDateTime;
  /** Why this one cannot be created — a trainer already booked at that hour. */
  conflict: string | null;
}

export interface RecurrencePreviewResponse {
  occurrences: OccurrenceResponse[];
  available_count: number;
  conflict_count: number;
}

/** All-or-nothing: a late collision rolls the whole group back with 409. */
export interface RecurrenceCreateResponse {
  recurrence_id: string;
  sessions: ClassSessionResponse[];
}

export interface AssignTrainerRequest {
  trainer_id: number;
}

export interface CancelSessionRequest {
  reason: string;
}

export interface CancelSessionResponse {
  session_id: number;
  refunded_booking_ids: number[];
  cancelled_waitlist_ids: number[];
}

export type TrainerStatsParams = {
  trainer_id: number;
  year: number;
  month: number;
};

export interface TrainerMonthStatsResponse {
  trainer_id: number;
  year: number;
  month: number;
  scheduled_sessions: number;
  cancelled_sessions: number;
  total_bookings: number;
}

/* ── Bookings ───────────────────────────────────────────────────────────── */

export interface BookingResponse {
  id: number;
  class_session_id: number;
  student_id: number;
  student_package_id: number;
  status: BookingStatus;
  created_at: IsoDateTime;
}

export type BookingListParams = {
  class_session_id?: number;
  student_id?: number;
  status?: BookingStatus;
  held_only?: boolean;
  starts_from?: IsoDateTime;
  starts_to?: IsoDateTime;
  limit?: number;
};

export interface BookingCreateRequest {
  class_session_id: number;
  /** Omit: means me. A student may not book against another profile. */
  student_id?: number | null;
  /** Omit: the backend picks the active package expiring soonest. */
  student_package_id?: number | null;
}

export interface BookingResult {
  booking: BookingResponse;
  student_package_id: number;
  credits_remaining: number;
}

export interface CancelBookingRequest {
  note?: string | null;
}

/** `refunded` is data, not a colour. Say it in words. */
export interface CancelBookingResult {
  booking_id: number;
  status: BookingStatus;
  refunded: boolean;
  credits_remaining: number;
}

export interface ChangeBookingRequest {
  new_class_session_id: number;
  student_package_id?: number | null;
}

/** Both halves succeed or neither does. */
export interface ChangeBookingResult {
  cancelled: CancelBookingResult;
  booked: BookingResult;
}

export interface AttendanceRequest {
  status: AttendanceStatus;
}

export interface AttendanceResponse {
  id: number;
  class_session_id: number;
  student_id: number;
  status: BookingStatus;
  attendance_marked_by: number | null;
  attendance_marked_at: IsoDateTime | null;
}

/** What a trainer sees: names and attendance. No money, no package. */
export interface AttendanceRosterItem extends AttendanceResponse {
  student_name: string;
}

/* ── Student schedule ───────────────────────────────────────────────────── */

export type MyScheduleParams = {
  /** Staff only, for the class-history tab on a student's profile. */
  student_id?: number;
  starts_from?: IsoDateTime;
  starts_to?: IsoDateTime;
  include_cancelled?: boolean;
  limit?: number;
};

/**
 * The cancellation terms come decided. Three rules combine into
 * `refund_if_cancelled_now`; a second copy in the client is the one that drifts.
 */
export interface MyScheduleItem {
  booking_id: number;
  class_session_id: number;
  starts_at: IsoDateTime;
  ends_at: IsoDateTime;
  class_type: ClassType;
  trainer_name: string;
  session_status: SessionStatus;
  booking_status: BookingStatus;
  cancel_deadline: IsoDateTime;
  refund_if_cancelled_now: boolean;
  can_cancel: boolean;
}

export type BookableParams = {
  student_id?: number;
  starts_to?: IsoDateTime;
  limit?: number;
};

/* ── Renewal reminders ──────────────────────────────────────────────────── */

export type RenewalListParams = {
  max_credits?: number;
  max_days?: number;
  contacted?: boolean;
  limit?: number;
};

export interface RenewalCandidateResponse {
  student_id: number;
  student_name: string;
  student_phone: string;
  student_package_id: number;
  package_name: string;
  credits_remaining: number;
  end_date: IsoDate;
  days_remaining: number;
  /** Which thresholds fired. Free-form strings from the backend. */
  reasons: string[];
  last_contacted_at: IsoDateTime | null;
  last_contact_result: string | null;
  next_contact_date: IsoDate | null;
}

/** Head-count only: this board sits at a desk customers can see. */
export interface RenewalSummaryResponse {
  needing_contact: number;
  low_credits: number;
  expiring_soon: number;
  never_contacted: number;
}

export interface RenewalContactRequest {
  student_id: number;
  result: string;
  next_contact_date?: IsoDate | null;
}

export interface RenewalContactResponse {
  id: number;
  student_id: number;
  contacted_at: IsoDateTime;
  result: string;
  next_contact_date: IsoDate | null;
  actor_user_id: number;
}

/* ── Reports ────────────────────────────────────────────────────────────── */

export type ReportPeriodParams = {
  period_start?: IsoDate;
  period_end?: IsoDate;
};

export interface DashboardNumber {
  key: string;
  label: string;
  /** `null` means not measured. Leave the cell empty. */
  value: number | null;
  /** Use this string as given; never assemble the link. */
  detail_path: string;
}

export interface SessionRowResponse {
  class_session_id: number;
  starts_at: IsoDateTime;
  trainer_name: string;
  capacity: number;
  booked_count: number;
  status: SessionStatus;
}

/** No revenue tile, on purpose — this board is visible from the counter. */
export interface DashboardResponse {
  numbers: DashboardNumber[];
  sessions_needing_attention: SessionRowResponse[];
  sessions_today: SessionRowResponse[];
}

export interface RevenueByMethodResponse {
  method: PaymentMethod;
  total: DecimalString;
  payment_count: number;
}

/** `CONFIRMED` payments only, counted by `confirmed_at`. */
export interface RevenueSummaryResponse {
  period_start: IsoDate;
  period_end: IsoDate;
  total: DecimalString;
  payment_count: number;
  by_method: RevenueByMethodResponse[];
  detail_path: string;
}

export type RevenueDetailParams = ReportPeriodParams & {
  limit?: number;
};

export interface RevenueRowResponse {
  payment_id: number;
  confirmed_at: IsoDateTime;
  student_name: string;
  package_name: string;
  amount: DecimalString;
  method: PaymentMethod;
}

export interface ClassStatsResponse {
  period_start: IsoDate;
  period_end: IsoDate;
  scheduled_sessions: number;
  cancelled_sessions: number;
  total_bookings: number;
  total_capacity: number;
  /** `null` when no class ran in the period. Not 0 — leave the cell empty. */
  fill_rate: number | null;
  detail_path: string;
}

export interface TrainerStatsResponse {
  trainer_id: number;
  trainer_name: string;
  scheduled_sessions: number;
  cancelled_sessions: number;
  total_bookings: number;
}

export interface TrainerClassSizeResponse {
  trainer_id: number;
  trainer_name: string;
  size_1: number;
  size_2: number;
  size_3: number;
  size_4: number;
  size_5: number;
  /** Classes larger than five. Usually 0. */
  sessions_over_max: number;
  /** Scheduled but nobody booked — the class did not happen. Not a cancellation. */
  sessions_empty: number;
  total_sessions: number;
}

export type ReportExportParams = ReportPeriodParams & {
  format?: ExportFormat;
};

export type UnconfirmedPaymentParams = {
  older_than_days?: number;
};

export interface UnconfirmedPaymentResponse {
  payment_id: number;
  student_id: number;
  student_name: string;
  student_package_id: number;
  package_name: string;
  amount: DecimalString;
  recorded_at: IsoDateTime;
  days_pending: number;
}
