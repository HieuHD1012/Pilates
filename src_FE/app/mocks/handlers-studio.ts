import { HttpResponse, http, type HttpHandler } from "msw";

import type {
  AccountInput,
  AccountRow,
  Lead,
  LeadNote,
  LeadConversionInput,
  LeadStatus,
  Payment,
  PaymentInput,
  PaymentStatus,
  RenewalCandidate,
  RescheduleOption,
  RosterEntry,
  SessionAdjustmentInput,
  SessionLedger,
  SessionLedgerEntry,
  StaffBookingInput,
  StudentInput,
  StudentSummary,
} from "~/lib/api/types";

import {
  buildClassReport,
  buildLeadDetail,
  buildRevenueReport,
  seedRoster,
  DEMO_PACKAGE,
  seedLedger,
  seedLeadNotes,
  buildStudentDetail,
  DEMO_JOINED_AT,
  buildTrainerDetail,
  buildTrainerReport,
  DEMO_ACCOUNTS,
  DEMO_LEADS,
  DEMO_PACKAGE_DEFINITIONS,
  DEMO_PAYMENTS,
  DEMO_RENEWALS,
  DEMO_STAFF,
  DEMO_STUDENTS,
  DEMO_TRAINERS,
} from "./fixtures";
import {
  adjustDemoStudentSessions,
  cancellationFor,
  classes,
  findClass,
  inRange,
  releaseBooking,
  url,
} from "./handlers";

/**
 * Studio operations endpoints.
 *
 * Split from `handlers.ts` only for file size; it shares that module's mutable
 * class state so a booking made on a student screen shows up on the staff
 * calendar in the same session.
 */

const leads: Lead[] = DEMO_LEADS.map((lead) => ({ ...lead }));
/** Contact history, keyed by lead. Appended to when staff log an outcome. */
const leadNotes = new Map<string, LeadNote[]>(
  leads.map((lead) => [lead.id, seedLeadNotes(lead)]),
);
/** Which student a converted lead became. Empty until a conversion happens. */
const leadStudentId = new Map<string, string>();

/**
 * Real booking records, replacing the roster that used to be synthesised from a
 * count. A count cannot be cancelled or moved, and staff acting for a student is
 * exactly that: cancelling and moving individual bookings.
 *
 * Seeded lazily from the class's own counts, so the demo week still looks the way
 * it did before anyone touched it.
 */
const rosters = new Map<string, RosterEntry[]>();
let nextBookingSeq = 1;

function rosterFor(classId: string): RosterEntry[] {
  const existing = rosters.get(classId);
  if (existing) return existing;
  const item = findClass(classId);
  const seeded = item ? seedRoster(item.bookedCount, item.waitlistCount) : [];
  rosters.set(classId, seeded);
  return seeded;
}

function splitRoster(classId: string): { booked: RosterEntry[]; waitlist: RosterEntry[] } {
  const all = rosterFor(classId);
  return {
    booked: all.filter((e) => e.status === "booked" || e.status === "attended"),
    waitlist: all
      .filter((e) => e.status === "waitlisted")
      .map((e, index) => ({ ...e, waitlistPosition: index + 1 })),
  };
}

function findBooking(
  bookingId: string,
): { classId: string; entry: RosterEntry; entries: RosterEntry[] } | null {
  for (const [classId, entries] of rosters) {
    const entry = entries.find((e) => e.bookingId === bookingId);
    if (entry) return { classId, entry, entries };
  }
  // Not seeded yet: the roster is built on first read, so touch every class.
  for (const item of classes) {
    const entries = rosterFor(item.id);
    const entry = entries.find((e) => e.bookingId === bookingId);
    if (entry) return { classId: item.id, entry, entries };
  }
  return null;
}

/**
 * Moves a student's session balance and keeps the ledger and the roster row
 * telling the same story.
 *
 * Where a package ledger exists, the ledger is authoritative and the roster
 * number is derived from it — that is the confirmed rule. Where it does not (the
 * demo roster ships one package), the roster number moves on its own, and the
 * reconciliation warning on the ledger screen would catch any drift.
 */
function chargeSessions(
  studentId: string,
  delta: number,
  reason: string,
  refType: SessionLedgerEntry["refType"],
  refId: string | null,
): void {
  const owner = ledgerOwner(DEMO_PACKAGE.id);
  if (owner?.studentId === studentId && ledgerEntries.has(DEMO_PACKAGE.id)) {
    const entries = ledgerEntries.get(DEMO_PACKAGE.id)!;
    entries.push({
      id: `${DEMO_PACKAGE.id}-b${entries.length + 1}`,
      studentPackageId: DEMO_PACKAGE.id,
      delta,
      reason,
      refType,
      refId,
      actorName: DEMO_STAFF.fullName,
      createdAt: new Date().toISOString(),
    });
    syncPackageBalance(DEMO_PACKAGE.id);
    return;
  }
  const row = students.find((st) => st.id === studentId);
  if (row && row.sessionsRemaining !== null) {
    row.sessionsRemaining = row.sessionsRemaining + delta;
    row.renewalDue = renewalDueFor(row.sessionsRemaining, DEMO_PACKAGE.expiryDate);
  }
}

/** Sessions the student has left, or null when the studio has recorded no package. */
function balanceOf(studentId: string): number | null {
  const owner = ledgerOwner(DEMO_PACKAGE.id);
  if (owner?.studentId === studentId) return packageBalances.get(DEMO_PACKAGE.id) ?? 0;
  return students.find((st) => st.id === studentId)?.sessionsRemaining ?? null;
}

const STATUS_NOTE: Record<Lead["status"], string> = {
  new: "mới",
  contacted: "đã liên hệ",
  scheduled: "đã hẹn lịch",
  converted: "đã chuyển",
  lost: "không theo tiếp",
};

function appendLeadNote(leadId: string, body: string, at: string): void {
  const notes = leadNotes.get(leadId) ?? [];
  notes.push({
    id: `${leadId}-n${notes.length + 1}`,
    body,
    actorName: "Nhân viên Demo",
    createdAt: at,
  });
  leadNotes.set(leadId, notes);
}
const students: StudentSummary[] = DEMO_STUDENTS.map((s) => ({ ...s }));
let nextStudentSeq = students.length + 1;

const digits = (value: string) => value.replace(/\D/g, "");

/** The duplicate-phone check the function list calls for. Backend-side by design. */
function phoneTaken(phone: string, exceptId?: string) {
  const target = digits(phone);
  return students.some((s) => digits(s.phone) === target && s.id !== exceptId);
}

/**
 * The per-record fields that are not on `StudentSummary`. Held here rather than
 * synthesised in the fixture builder, because an edit that returns 200 and then
 * shows the old value is worse than an edit that fails.
 */
interface StudentRecord {
  joinedAt: string;
  email: string | null;
  note: string | null;
}
const studentRecords = new Map<string, StudentRecord>(
  DEMO_STUDENTS.map((s) => [s.id, { joinedAt: DEMO_JOINED_AT, email: null, note: null }]),
);
function recordFor(id: string): StudentRecord {
  const existing = studentRecords.get(id);
  if (existing) return existing;
  const fresh: StudentRecord = { joinedAt: DEMO_JOINED_AT, email: null, note: null };
  studentRecords.set(id, fresh);
  return fresh;
}
const renewals: RenewalCandidate[] = DEMO_RENEWALS.map((r) => ({ ...r }));
const payments: Payment[] = DEMO_PAYMENTS.map((p) => ({ ...p }));
let nextPaymentSeq = DEMO_PAYMENTS.length + 1;

/**
 * Ledgers keyed by student package. Seeded for the demo package only — a student
 * created through the studio form has no package yet, and inventing one so the
 * screen looks populated is exactly the fabrication AGENTS.md rule 19 forbids.
 */
const ledgerEntries = new Map<string, SessionLedgerEntry[]>([
  [DEMO_PACKAGE.id, seedLedger(DEMO_PACKAGE.id)],
]);
/** The package balance, kept equal to the sum of its ledger. */
const packageBalances = new Map<string, number>([
  [DEMO_PACKAGE.id, DEMO_PACKAGE.sessionsRemaining],
]);

function syncPackageBalance(studentPackageId: string): number {
  const total = (ledgerEntries.get(studentPackageId) ?? []).reduce(
    (sum, entry) => sum + entry.delta,
    0,
  );
  packageBalances.set(studentPackageId, total);
  // The roster row shows the same number, so it moves with the ledger.
  const owner = ledgerOwner(studentPackageId);
  if (owner) {
    const row = students.find((s) => s.id === owner.studentId);
    if (row) {
      row.sessionsRemaining = total;
      row.renewalDue = renewalDueFor(total, DEMO_PACKAGE.expiryDate);
    }
  }
  return total;
}

/**
 * CONFIRMED rule: renewal is flagged at 6 sessions or 15 days remaining, and the
 * backend owns the decision — the frontend never recomputes the threshold. So the
 * mock has to recompute it, or adjusting a balance from 4 to 20 would leave a
 * student sitting in the renewals list with twenty sessions in hand.
 */
function renewalDueFor(sessionsRemaining: number, expiryDate: string): boolean {
  if (sessionsRemaining <= 6) return true;
  const daysLeft = Math.ceil(
    (new Date(`${expiryDate}T00:00:00+07:00`).getTime() - Date.now()) / 86_400_000,
  );
  return daysLeft <= 15;
}

/**
 * Which student a package belongs to. The demo roster ships one package, held by
 * the first demo student; a real backend would carry this on the package itself.
 */
function ledgerOwner(
  studentPackageId: string,
): { studentId: string; studentName: string; packageName: string } | null {
  if (studentPackageId !== DEMO_PACKAGE.id) return null;
  const owner = students.find((s) => s.id === DEMO_STUDENTS[0]?.id);
  if (!owner) return null;
  return {
    studentId: owner.id,
    studentName: owner.fullName,
    packageName: DEMO_PACKAGE.packageName,
  };
}

function ledgerFor(studentPackageId: string): SessionLedger | null {
  const entries = ledgerEntries.get(studentPackageId);
  const owner = ledgerOwner(studentPackageId);
  if (!entries || !owner) return null;
  return {
    studentPackageId,
    ...owner,
    sessionsRemaining: packageBalances.get(studentPackageId) ?? 0,
    entries,
  };
}

const accounts = DEMO_ACCOUNTS.map((a) => ({ ...a }));
let nextAccountSeq = DEMO_ACCOUNTS.length + 1;

function rangeParams(request: Request) {
  const params = new URL(request.url).searchParams;
  const to = params.get("to") ?? new Date().toISOString().slice(0, 10);
  const from = params.get("from") ?? to;
  return { from, to };
}

export const studioHandlers: HttpHandler[] = [
  /* ── Student self-service ─────────────────────────────────────────────── */

  http.get(url("/student/profile"), () =>
    HttpResponse.json({
      id: "s-demo-1",
      fullName: "Học viên Demo",
      phone: "0900 000 000",
      email: null,
      joinedAt: "2026-06-18",
    }),
  ),

  http.delete(url("/student/bookings/:bookingId"), ({ params }) => {
    const bookingId = String(params.bookingId);
    // The mock booking id is `b-<classId>`; recover the class to free a seat.
    const item = findClass(bookingId.replace(/^b-/, ""));
    if (!item) return new HttpResponse(null, { status: 404 });
    if (new Date(item.startsAt).getTime() < Date.now()) {
      return HttpResponse.json(
        { code: "booking_closed", message: "Lớp đã diễn ra" },
        { status: 409 },
      );
    }
    /**
     * The refund follows the studio's policy, not a constant. This used to answer
     * `refunded: true` every time while the screen above it told the student they
     * were past the deadline — the two disagreed, and the screen was right.
     */
    const terms = cancellationFor(item);
    const refunded = terms?.refundable ?? false;
    item.bookedCount = Math.max(0, item.bookedCount - 1);
    releaseBooking(item.id);
    if (refunded) adjustDemoStudentSessions(1);
    return HttpResponse.json({ refunded, sessionsReturned: refunded ? 1 : 0 });
  }),

  /* ── Trainer ──────────────────────────────────────────────────────────── */

  http.get(url("/trainer/profile"), () =>
    HttpResponse.json(buildTrainerDetail(DEMO_TRAINERS[0]!.id)),
  ),

  http.get(url("/trainer/classes/:classId/roster"), ({ params }) => {
    const item = findClass(String(params.classId));
    if (!item) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ classSession: item, ...splitRoster(item.id) });
  }),

  /* ── Staff · people ───────────────────────────────────────────────────── */

  http.get(url("/staff/students"), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const search = (params.get("search") ?? "").trim().toLowerCase();
    const status = params.get("status") ?? "all";
    const items = students.filter(
      (s) =>
        (status === "all" || s.status === status) &&
        (search === "" ||
          s.fullName.toLowerCase().includes(search) ||
          s.phone.replace(/\s/g, "").includes(search.replace(/\s/g, ""))),
    );
    return HttpResponse.json({ items });
  }),

  http.post(url("/staff/students"), async ({ request }) => {
    const body = (await request.json()) as Partial<StudentInput>;
    if (!body.fullName?.trim() || !body.phone?.trim()) {
      return HttpResponse.json(
        {
          code: "validation_failed",
          fieldErrors: {
            ...(body.fullName?.trim() ? {} : { fullName: ["Vui lòng nhập họ tên"] }),
            ...(body.phone?.trim() ? {} : { phone: ["Vui lòng nhập số điện thoại"] }),
          },
        },
        { status: 422 },
      );
    }
    if (phoneTaken(body.phone)) {
      return HttpResponse.json(
        { code: "phone_taken", message: "Số điện thoại đã có hồ sơ" },
        { status: 409 },
      );
    }
    const created: StudentSummary = {
      id: `s-${String(nextStudentSeq++).padStart(2, "0")}`,
      fullName: body.fullName.trim(),
      phone: body.phone.trim(),
      status: "inactive",
      currentPackageName: null,
      sessionsRemaining: null,
      expiryDate: null,
      renewalDue: false,
    };
    students.unshift(created);
    studentRecords.set(created.id, {
      joinedAt: new Date().toISOString().slice(0, 10),
      email: body.email?.trim() || null,
      note: body.note?.trim() || null,
    });
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(url("/staff/students/:studentId"), async ({ params, request }) => {
    const body = (await request.json()) as Partial<StudentInput>;
    const row = students.find((s) => s.id === String(params.studentId));
    if (!row) return new HttpResponse(null, { status: 404 });
    if (body.phone && phoneTaken(body.phone, row.id)) {
      return HttpResponse.json(
        { code: "phone_taken", message: "Số điện thoại đã có hồ sơ" },
        { status: 409 },
      );
    }
    if (body.fullName?.trim()) row.fullName = body.fullName.trim();
    if (body.phone?.trim()) row.phone = body.phone.trim();
    const record = recordFor(row.id);
    if (body.email !== undefined) record.email = body.email?.trim() || null;
    if (body.note !== undefined) record.note = body.note?.trim() || null;
    return HttpResponse.json(row);
  }),

  http.post(url("/staff/leads/:leadId/convert"), async ({ params, request }) => {
    const body = (await request.json()) as Partial<LeadConversionInput>;
    const lead = leads.find((l) => l.id === String(params.leadId));
    if (!lead) return new HttpResponse(null, { status: 404 });
    if (lead.status === "converted") {
      return HttpResponse.json(
        { code: "already_converted", message: "Khách này đã có hồ sơ học viên" },
        { status: 409 },
      );
    }
    const phone = (body.phone ?? lead.phone).trim();
    if (phoneTaken(phone)) {
      return HttpResponse.json(
        { code: "phone_taken", message: "Số điện thoại đã có hồ sơ" },
        { status: 409 },
      );
    }
    const created: StudentSummary = {
      id: `s-${String(nextStudentSeq++).padStart(2, "0")}`,
      fullName: (body.fullName ?? lead.fullName).trim(),
      phone,
      status: "inactive",
      currentPackageName: null,
      sessionsRemaining: null,
      expiryDate: null,
      renewalDue: false,
    };
    students.unshift(created);
    studentRecords.set(created.id, {
      joinedAt: new Date().toISOString().slice(0, 10),
      email: body.email?.trim() || null,
      note: body.note?.trim() || lead.need.trim() || null,
    });
    const now = new Date().toISOString();
    lead.status = "converted";
    lead.lastContactedAt = now;
    leadStudentId.set(lead.id, created.id);
    appendLeadNote(lead.id, `Đã tạo hồ sơ học viên ${created.fullName}.`, now);
    return HttpResponse.json({ studentId: created.id, lead }, { status: 201 });
  }),

  http.get(url("/staff/students/:studentId"), ({ params }) => {
    const base = students.find((s) => s.id === String(params.studentId));
    if (!base) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(buildStudentDetail(base, { ...recordFor(base.id), payments }));
  }),

  http.get(url("/staff/trainers/:trainerId"), ({ params }) => {
    const detail = buildTrainerDetail(String(params.trainerId));
    if (!detail) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(detail);
  }),

  /**
   * Staff booking a student in (Q5: staff and trainers may act for a student).
   *
   * The same rules a student meets apply — a full class, a cancelled class, a past
   * class and an empty balance all refuse. There is no override, because the
   * studio has not said there is one.
   */
  http.post(url("/staff/bookings"), async ({ request }) => {
    const body = (await request.json()) as Partial<StaffBookingInput>;
    const item = body.classId ? findClass(body.classId) : undefined;
    const student = students.find((st) => st.id === body.studentId);
    if (!item || !student) return new HttpResponse(null, { status: 404 });

    const entries = rosterFor(item.id);
    const already = entries.find(
      (e) =>
        e.studentId === student.id && (e.status === "booked" || e.status === "waitlisted"),
    );
    if (already) {
      return HttpResponse.json(
        { code: "already_booked", message: "Học viên này đã có trong lớp" },
        { status: 409 },
      );
    }
    if (item.status === "cancelled") {
      return HttpResponse.json(
        { code: "class_cancelled", message: "Lớp đã hủy" },
        { status: 409 },
      );
    }
    if (new Date(item.startsAt).getTime() < Date.now()) {
      return HttpResponse.json(
        { code: "booking_closed", message: "Buổi này đã qua" },
        { status: 409 },
      );
    }
    if (item.bookedCount >= item.capacity) {
      return HttpResponse.json(
        { code: "class_full", message: "Lớp đã đủ chỗ" },
        { status: 409 },
      );
    }
    const balance = balanceOf(student.id);
    if (balance === null || balance <= 0) {
      return HttpResponse.json(
        {
          code: "no_sessions_remaining",
          message: "Học viên không còn buổi trong gói",
        },
        { status: 409 },
      );
    }

    const entry: RosterEntry = {
      bookingId: `b-staff-${nextBookingSeq++}`,
      studentId: student.id,
      fullName: student.fullName,
      phone: student.phone,
      status: "booked",
      bookedAt: new Date().toISOString(),
      waitlistPosition: null,
      sessionsCharged: 1,
    };
    entries.push(entry);
    item.bookedCount += 1;
    chargeSessions(student.id, -1, `Đặt lớp ${item.title}`, "booking", entry.bookingId);
    return HttpResponse.json(entry, { status: 201 });
  }),

  /**
   * Cancelling on a student's behalf. The refund follows the studio's own policy
   * (`CANCELLATION_POLICY`) exactly as it does for a student cancelling: inside
   * the window the buổi comes back, outside it does not.
   */
  http.delete(url("/staff/bookings/:bookingId"), ({ params }) => {
    const found = findBooking(String(params.bookingId));
    if (!found) return new HttpResponse(null, { status: 404 });
    const { classId, entry } = found;
    const item = findClass(classId);
    if (!item) return new HttpResponse(null, { status: 404 });
    if (entry.status === "cancelled") {
      return HttpResponse.json(
        { code: "already_cancelled", message: "Lượt đặt này đã hủy" },
        { status: 409 },
      );
    }

    const terms = cancellationFor(item);
    const refundable = terms?.refundable ?? false;
    if (entry.status === "booked") item.bookedCount = Math.max(0, item.bookedCount - 1);
    entry.status = "cancelled";
    if (refundable && entry.sessionsCharged > 0) {
      chargeSessions(
        entry.studentId,
        entry.sessionsCharged,
        `Hủy đúng hạn ${item.title}`,
        "cancellation",
        entry.bookingId,
      );
      entry.sessionsCharged = 0;
    }
    return HttpResponse.json({ refunded: refundable, entry });
  }),

  /**
   * Where a booking may move to. The backend decides; the screen lists.
   * Same class type, still in the future, not cancelled, and with a free place.
   */
  http.get(url("/staff/bookings/:bookingId/reschedule-options"), ({ params }) => {
    const found = findBooking(String(params.bookingId));
    if (!found) return new HttpResponse(null, { status: 404 });
    const current = findClass(found.classId);
    if (!current) return new HttpResponse(null, { status: 404 });

    const items: RescheduleOption[] = classes
      .filter(
        (c) =>
          c.id !== current.id &&
          c.type === current.type &&
          c.status !== "cancelled" &&
          new Date(c.startsAt).getTime() > Date.now() &&
          c.bookedCount < c.capacity &&
          !rosterFor(c.id).some(
            (e) =>
              e.studentId === found.entry.studentId &&
              (e.status === "booked" || e.status === "waitlisted"),
          ),
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 30)
      .map((c) => ({
        classId: c.id,
        title: c.title,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        trainerName: c.trainer.fullName,
        capacity: c.capacity,
        bookedCount: c.bookedCount,
      }));
    return HttpResponse.json({ items });
  }),

  /**
   * Moving a booking. One buổi in, one buổi out — the session already charged
   * travels with it, so rescheduling never costs a second buổi.
   */
  http.patch(url("/staff/bookings/:bookingId"), async ({ params, request }) => {
    const body = (await request.json()) as { classId?: string };
    const found = findBooking(String(params.bookingId));
    const target = body.classId ? findClass(body.classId) : undefined;
    if (!found || !target) return new HttpResponse(null, { status: 404 });
    const current = findClass(found.classId);
    if (!current) return new HttpResponse(null, { status: 404 });
    if (target.status === "cancelled") {
      return HttpResponse.json(
        { code: "class_cancelled", message: "Buổi đến đã hủy" },
        { status: 409 },
      );
    }
    if (target.bookedCount >= target.capacity) {
      return HttpResponse.json(
        { code: "class_full", message: "Buổi đến đã đủ chỗ" },
        { status: 409 },
      );
    }

    found.entries.splice(found.entries.indexOf(found.entry), 1);
    if (found.entry.status === "booked") {
      current.bookedCount = Math.max(0, current.bookedCount - 1);
    }
    const moved: RosterEntry = { ...found.entry, status: "booked", waitlistPosition: null };
    rosterFor(target.id).push(moved);
    target.bookedCount += 1;
    return HttpResponse.json(moved);
  }),

  http.get(url("/staff/classes/:classId/roster"), ({ params }) => {
    const item = findClass(String(params.classId));
    if (!item) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ classSession: item, ...splitRoster(item.id) });
  }),

  /* ── Staff · leads ────────────────────────────────────────────────────── */

  http.get(url("/staff/leads"), ({ request }) => {
    const status = new URL(request.url).searchParams.get("status") ?? "all";
    const items = leads.filter((l) => status === "all" || l.status === status);
    return HttpResponse.json({ items });
  }),

  http.get(url("/staff/leads/:leadId"), ({ params }) => {
    const id = String(params.leadId);
    const lead = leads.find((l) => l.id === id);
    if (!lead) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(
      buildLeadDetail(lead, leadNotes.get(id) ?? [], leadStudentId.get(id) ?? null),
    );
  }),

  http.patch(url("/staff/leads/:leadId"), async ({ params, request }) => {
    const body = (await request.json()) as {
      status?: LeadStatus;
      followUpAt?: string | null;
    };
    const lead = leads.find((l) => l.id === String(params.leadId));
    if (!lead) return new HttpResponse(null, { status: 404 });
    const previous = lead.status;
    if (body.status) lead.status = body.status;
    if (body.followUpAt !== undefined) lead.followUpAt = body.followUpAt;
    const now = new Date().toISOString();
    lead.lastContactedAt = now;
    appendLeadNote(
      lead.id,
      body.status && body.status !== previous
        ? `Trạng thái: ${STATUS_NOTE[previous]} → ${STATUS_NOTE[lead.status]}`
        : "Đã liên hệ, trạng thái không đổi",
      now,
    );
    return HttpResponse.json(lead);
  }),

  /* ── Staff · commerce ─────────────────────────────────────────────────── */

  http.get(url("/staff/packages"), () =>
    HttpResponse.json({ items: DEMO_PACKAGE_DEFINITIONS }),
  ),

  http.get(url("/staff/payments"), ({ request }) => {
    const url_ = new URL(request.url);
    const status = url_.searchParams.get("status") ?? "all";
    const from = url_.searchParams.get("from");
    const to = url_.searchParams.get("to");
    const items = payments.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      // The screen asks for a date range; ignoring it made August show July rows.
      const day = p.recordedAt.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
    return HttpResponse.json({ items });
  }),

  http.post(url("/staff/payments"), async ({ request }) => {
    const body = (await request.json()) as Partial<PaymentInput>;
    const student = students.find((s) => s.id === body.studentId);
    const fieldErrors: Record<string, string[]> = {};
    if (!student) fieldErrors.studentId = ["Chọn học viên nhận khoản thu này"];
    if (!Number.isFinite(body.amount) || (body.amount ?? 0) <= 0) {
      fieldErrors.amount = ["Nhập số tiền lớn hơn 0"];
    }
    if (!body.reference?.trim()) fieldErrors.reference = ["Ghi nội dung khoản thu"];
    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        { code: "validation_failed", message: "Dữ liệu chưa hợp lệ", fieldErrors },
        { status: 422 },
      );
    }

    const created: Payment = {
      id: `p-${String(nextPaymentSeq++).padStart(2, "0")}`,
      studentId: student!.id,
      studentName: student!.fullName,
      amount: Math.round(body.amount!),
      method: body.method === "cash" ? "cash" : "transfer",
      status: body.status === "pending" ? "pending" : "confirmed",
      reference: body.reference!.trim(),
      recordedBy: DEMO_STAFF.fullName,
      recordedAt: new Date().toISOString(),
      voidReason: null,
    };
    payments.unshift(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  /**
   * Confirm or void. A confirmed record cannot be edited back to pending: the
   * correction path for a wrong record is a void with a stated reason, which is
   * what an audit trail means.
   */
  http.patch(url("/staff/payments/:paymentId"), async ({ params, request }) => {
    const body = (await request.json()) as { status?: PaymentStatus; voidReason?: string };
    const row = payments.find((p) => p.id === String(params.paymentId));
    if (!row) return new HttpResponse(null, { status: 404 });
    if (row.status === "void") {
      return HttpResponse.json(
        { code: "already_void", message: "Phiếu này đã hủy" },
        { status: 409 },
      );
    }
    if (body.status === "confirmed") {
      row.status = "confirmed";
      return HttpResponse.json(row);
    }
    if (body.status === "void") {
      if (!body.voidReason?.trim()) {
        return HttpResponse.json(
          {
            code: "validation_failed",
            message: "Dữ liệu chưa hợp lệ",
            fieldErrors: { voidReason: ["Nêu lý do hủy phiếu"] },
          },
          { status: 422 },
        );
      }
      row.status = "void";
      row.voidReason = body.voidReason.trim();
      return HttpResponse.json(row);
    }
    return HttpResponse.json(
      { code: "unsupported_transition", message: "Chuyển trạng thái không hợp lệ" },
      { status: 422 },
    );
  }),

  http.get(url("/staff/ledger/:studentPackageId"), ({ params }) => {
    const id = String(params.studentPackageId);
    const ledger = ledgerFor(id);
    if (!ledger) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(ledger);
  }),

  /**
   * A manual adjustment. The reason is required by the business rules, and the
   * balance is recomputed from the ledger rather than patched alongside it —
   * `sessionsRemaining` equals the sum of the deltas, and the mock has no licence
   * to make those two disagree.
   */
  http.post(
    url("/staff/ledger/:studentPackageId/adjustments"),
    async ({ params, request }) => {
      const id = String(params.studentPackageId);
      const body = (await request.json()) as Partial<SessionAdjustmentInput>;
      const entries = ledgerEntries.get(id);
      if (!entries) return new HttpResponse(null, { status: 404 });

      const fieldErrors: Record<string, string[]> = {};
      const delta = Number(body.delta);
      if (!Number.isInteger(delta) || delta === 0) {
        fieldErrors.delta = ["Nhập số buổi cộng hoặc trừ, khác 0"];
      }
      if (!body.reason?.trim()) {
        fieldErrors.reason = ["Điều chỉnh thủ công phải có lý do"];
      }
      if (Object.keys(fieldErrors).length > 0) {
        return HttpResponse.json(
          { code: "validation_failed", message: "Dữ liệu chưa hợp lệ", fieldErrors },
          { status: 422 },
        );
      }

      entries.push({
        id: `${id}-m${entries.length + 1}`,
        studentPackageId: id,
        delta,
        reason: body.reason!.trim(),
        refType: "manual",
        refId: null,
        actorName: DEMO_STAFF.fullName,
        createdAt: new Date().toISOString(),
      });
      syncPackageBalance(id);
      return HttpResponse.json(ledgerFor(id), { status: 201 });
    },
  ),

  http.get(url("/staff/renewals"), () => HttpResponse.json({ items: renewals })),

  http.patch(url("/staff/renewals/:studentId"), async ({ params, request }) => {
    const body = (await request.json()) as { followUpAt?: string | null };
    const row = renewals.find((r) => r.studentId === String(params.studentId));
    if (!row) return new HttpResponse(null, { status: 404 });
    row.lastContactedAt = new Date().toISOString();
    if (body.followUpAt !== undefined) row.followUpAt = body.followUpAt;
    return HttpResponse.json(row);
  }),

  /* ── Staff · accounts ─────────────────────────────────────────────────── */

  http.get(url("/staff/accounts"), () => HttpResponse.json({ items: accounts })),

  /**
   * Creating an account. The identifier is a phone number and it has to be unique,
   * because it is how the studio and the sign-in flow both identify a person.
   *
   * No password is set here — the response says an invitation went out, which is
   * what the backend would do.
   */
  http.post(url("/staff/accounts"), async ({ request }) => {
    const body = (await request.json()) as Partial<AccountInput>;
    const fieldErrors: Record<string, string[]> = {};
    if (!body.fullName?.trim()) fieldErrors.fullName = ["Nhập họ tên"];
    if (!body.identifier?.trim()) fieldErrors.identifier = ["Nhập số điện thoại"];
    const role = body.role;
    if (role !== "student" && role !== "trainer" && role !== "staff" && role !== "owner") {
      fieldErrors.role = ["Chọn quyền cho tài khoản"];
    }
    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        { code: "validation_failed", message: "Dữ liệu chưa hợp lệ", fieldErrors },
        { status: 422 },
      );
    }
    const target = digits(body.identifier!);
    if (accounts.some((a) => digits(a.identifier) === target)) {
      return HttpResponse.json(
        { code: "identifier_taken", message: "Số điện thoại đã có tài khoản" },
        { status: 409 },
      );
    }

    const created: AccountRow = {
      id: `u-${String(nextAccountSeq++).padStart(2, "0")}`,
      fullName: body.fullName!.trim(),
      identifier: body.identifier!.trim(),
      role: role!,
      status: "active",
      // Never signed in, because the invitation has only just gone out.
      lastSignInAt: null,
    };
    accounts.unshift(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(url("/staff/accounts/:accountId"), async ({ params, request }) => {
    const body = (await request.json()) as { status?: "active" | "locked" };
    const row = accounts.find((a) => a.id === String(params.accountId));
    if (!row) return new HttpResponse(null, { status: 404 });
    if (body.status) row.status = body.status;
    return HttpResponse.json(row);
  }),

  /* ── Staff · reports ──────────────────────────────────────────────────── */

  http.get(url("/staff/reports/revenue"), ({ request }) => {
    const { from, to } = rangeParams(request);
    return HttpResponse.json(buildRevenueReport(from, to, payments));
  }),

  http.get(url("/staff/reports/classes"), ({ request }) => {
    const { from, to } = rangeParams(request);
    return HttpResponse.json(buildClassReport(from, to, classes));
  }),

  http.get(url("/staff/reports/trainers"), ({ request }) => {
    const { from, to } = rangeParams(request);
    return HttpResponse.json(buildTrainerReport(from, to, classes));
  }),

  /* ── Public ───────────────────────────────────────────────────────────── */

  http.get(url("/public/promotions"), () => HttpResponse.json({ items: [] })),

  /* ── Student booking history ──────────────────────────────────────────── */

  http.get(url("/student/bookings/history"), () => {
    const past = classes
      .filter((item) => new Date(item.startsAt).getTime() < Date.now())
      .slice(-8)
      .reverse();
    return HttpResponse.json({
      items: past.map((item, index) => ({
        id: `bh-${item.id}`,
        status: index === 1 ? "cancelled" : "attended",
        classTitle: item.title,
        classType: item.type,
        trainerName: item.trainer.fullName,
        startsAt: item.startsAt,
        sessionsCharged: index === 1 ? 0 : 1,
        cancelledAt: index === 1 ? item.startsAt : null,
        refunded: index === 1 ? true : null,
      })),
    });
  }),

  /* Keep the range filter available for anything that needs it. */
  http.get(url("/staff/classes"), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const items = classes.filter((item) =>
      inRange(item, params.get("from"), params.get("to")),
    );
    return HttpResponse.json({ items });
  }),
];
