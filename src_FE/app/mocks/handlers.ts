import { HttpResponse, http, type HttpHandler } from "msw";

import { API_BASE } from "~/lib/api/client";
import type {
  AccountCreateRequest,
  AnnouncementCreateRequest,
  AttendanceRequest,
  BookingCreateRequest,
  BookingResponse,
  CancelSessionRequest,
  ChangeBookingRequest,
  ClassCreateRequest,
  ClassSessionResponse,
  LeadUpdateRequest,
  MyScheduleItem,
  PackageTypeCreateRequest,
  PackageTypeUpdateRequest,
  PaymentResponse,
  RecordPaymentRequest,
  RecurrenceRequest,
  RenewalContactRequest,
  RenewPackageRequest,
  Role,
  SellPackageRequest,
  StudentCreateRequest,
  StudentPackageResponse,
  StudentUpdateRequest,
  TrainerCreateRequest,
  TrainerUpdateRequest,
} from "~/lib/api/schema";

import {
  at,
  buildDemoBookings,
  buildDemoClasses,
  dayKey,
  DEMO_ACCOUNTS,
  DEMO_ANNOUNCEMENTS,
  DEMO_LEADS,
  DEMO_LEDGER,
  DEMO_PACKAGE_TYPES,
  DEMO_PACKAGES,
  DEMO_PAYMENTS,
  DEMO_PHOTOS,
  DEMO_RENEWAL_CONTACTS,
  DEMO_STUDENTS,
  DEMO_TRAINERS,
  DEMO_USERS,
} from "./fixtures";

/**
 * A development stand-in for the authoritative backend.
 *
 * It exists so screens can be built and tested against the real API **shape** —
 * paths, casing, enum spellings, status codes and error bodies all match
 * `docs/api/`. It is not a specification: where a rule is the backend's, this
 * implements the simplest version that is honest about the answer, and where
 * the studio has not confirmed something it returns the neutral value rather
 * than guessing (docs/OPEN_QUESTIONS.md).
 *
 * Cancellation deadlines are the one rule reproduced here, because a screen
 * cannot be built against `can_cancel` without something deciding it. The real
 * decision belongs to the backend; this is a stand-in, not a second copy that
 * production reads.
 */

export const url = (path: string) => `${API_BASE}${path}`;

/** The business-error envelope every endpoint uses. */
function fail(status: number, code: string, message: string) {
  return HttpResponse.json({ detail: { code, message } }, { status });
}

/* ── Mutable demo state ─────────────────────────────────────────────────── */

const classes = buildDemoClasses();
const bookings = buildDemoBookings(classes);
const packages = [...DEMO_PACKAGES];
const payments = [...DEMO_PAYMENTS];
const students = [...DEMO_STUDENTS];
const trainers = [...DEMO_TRAINERS];
const accounts = [...DEMO_ACCOUNTS];
const leads = [...DEMO_LEADS];
const announcements = [...DEMO_ANNOUNCEMENTS];
const packageTypes = [...DEMO_PACKAGE_TYPES];
const ledger = [...DEMO_LEDGER];
const contacts = [...DEMO_RENEWAL_CONTACTS];

let nextId = 1000;
const newId = () => (nextId += 1);

/**
 * Which demo account is signed in.
 *
 * Set with `localStorage.setItem("soul:demo-role", "ADMIN" | "STAFF" | "TRAINER")`
 * and reload; anything else is the student. There is no real token in
 * development — the fake never checks one, which is why nothing here is a
 * security statement.
 */
function demoRole(): Role {
  const raw =
    typeof localStorage === "undefined" ? null : localStorage.getItem("soul:demo-role");
  const upper = raw?.toUpperCase();
  if (upper === "ADMIN" || upper === "STAFF" || upper === "TRAINER") return upper;
  return "STUDENT";
}

function isStaff(): boolean {
  const role = demoRole();
  return role === "ADMIN" || role === "STAFF";
}

/** Group 4 hours, Private/Duo 1 hour — the confirmed studio thresholds. */
function cancelDeadline(session: ClassSessionResponse): string {
  const hours = session.class_type === "GROUP" ? 4 : 1;
  return new Date(new Date(session.starts_at).getTime() - hours * 3600_000).toISOString();
}

function sessionOf(id: number): ClassSessionResponse | undefined {
  return classes.find((item) => item.id === id);
}

function heldCount(sessionId: number): number {
  return bookings.filter(
    (booking) =>
      booking.class_session_id === sessionId &&
      (booking.status === "BOOKED" ||
        booking.status === "ATTENDED" ||
        booking.status === "NO_SHOW"),
  ).length;
}

function myScheduleItems(studentId: number, includeCancelled: boolean): MyScheduleItem[] {
  const now = Date.now();

  return bookings
    .filter((booking) => booking.student_id === studentId)
    .map((booking) => {
      const session = sessionOf(booking.class_session_id);
      if (session === undefined) return null;
      const deadline = cancelDeadline(session);
      const inTime = new Date(deadline).getTime() > now;

      return {
        booking_id: booking.id,
        class_session_id: session.id,
        starts_at: session.starts_at,
        ends_at: session.ends_at,
        class_type: session.class_type,
        trainer_name:
          trainers.find((t) => t.id === session.trainer_id)?.full_name ?? "DEMO HLV",
        session_status: session.status,
        booking_status: booking.status,
        cancel_deadline: deadline,
        refund_if_cancelled_now: inTime,
        can_cancel: booking.status === "BOOKED" && inTime,
      } satisfies MyScheduleItem;
    })
    .filter((item): item is MyScheduleItem => item !== null)
    .filter(
      (item) =>
        includeCancelled ||
        (item.booking_status !== "CANCELLED_INTIME" &&
          item.booking_status !== "CANCELLED_LATE"),
    );
}

function packageFor(studentId: number): StudentPackageResponse | undefined {
  return packages.find(
    (item) =>
      item.student_id === studentId && item.status === "ACTIVE" && item.balance_cached > 0,
  );
}

function addLedgerEntry(
  delta: number,
  reason: (typeof ledger)[number]["reason_code"],
  balanceAfter: number,
  bookingId: number | null,
  note: string | null = null,
) {
  ledger.push({
    id: newId(),
    delta,
    balance_after: balanceAfter,
    reason_code: reason,
    note,
    booking_id: bookingId,
    actor_user_id: DEMO_USERS[demoRole()].id,
    created_at: new Date().toISOString(),
  });
}

function num(request: Request, key: string): number | null {
  const value = new URL(request.url).searchParams.get(key);
  return value === null ? null : Number(value);
}

function str(request: Request, key: string): string | null {
  return new URL(request.url).searchParams.get(key);
}

/* ── Handlers ───────────────────────────────────────────────────────────── */

export const handlers: HttpHandler[] = [
  /* auth ---------------------------------------------------------------- */

  http.post(url("/auth/login"), () =>
    HttpResponse.json({
      access_token: "demo-access",
      refresh_token: "demo-refresh",
      token_type: "bearer",
    }),
  ),
  http.post(url("/auth/refresh"), () =>
    HttpResponse.json({
      access_token: "demo-access",
      refresh_token: "demo-refresh",
      token_type: "bearer",
    }),
  ),
  http.post(url("/auth/logout"), () => HttpResponse.json({ message: "Đã đăng xuất." })),
  http.get(url("/auth/me"), () => {
    const account = DEMO_USERS[demoRole()];
    return HttpResponse.json({
      id: account.id,
      email: account.email,
      full_name: account.full_name,
      phone: account.phone,
      role: account.role,
      status: account.status,
      student_id: account.student_id,
      trainer_id: account.trainer_id,
    });
  }),
  http.patch(url("/auth/me"), async ({ request }) => {
    const body = (await request.json()) as { full_name?: string; phone?: string | null };
    const account = DEMO_USERS[demoRole()];
    if (body.full_name !== undefined) account.full_name = body.full_name;
    if (body.phone !== undefined) account.phone = body.phone;
    return HttpResponse.json(account);
  }),
  http.post(url("/auth/change-password"), () =>
    HttpResponse.json({ message: "Đã đổi mật khẩu." }),
  ),
  http.post(url("/auth/forgot-password"), () =>
    HttpResponse.json({ message: "Nếu email tồn tại, hướng dẫn đã được gửi." }),
  ),
  http.post(url("/auth/reset-password"), () =>
    HttpResponse.json({ message: "Đã đặt mật khẩu mới." }),
  ),

  /* accounts ------------------------------------------------------------ */

  http.get(url("/accounts"), () => HttpResponse.json(accounts)),
  http.get(url("/accounts/:accountId"), ({ params }) => {
    const found = accounts.find((a) => a.id === Number(params.accountId));
    return found
      ? HttpResponse.json(found)
      : fail(404, "NOT_FOUND", "Không tìm thấy tài khoản.");
  }),
  http.post(url("/accounts"), async ({ request }) => {
    const body = (await request.json()) as AccountCreateRequest;
    if (accounts.some((a) => a.email === body.email)) {
      return fail(409, "EMAIL_TAKEN", "Email này đã có tài khoản.");
    }
    const created = {
      id: newId(),
      email: body.email,
      full_name: body.full_name ?? null,
      phone: body.phone ?? null,
      role: body.role,
      status: "PENDING_ACTIVATION" as const,
      is_active: true,
      created_at: new Date().toISOString(),
      student_id: body.student_id ?? null,
      trainer_id: null,
    };
    accounts.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch(url("/accounts/:accountId"), async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const found = accounts.find((a) => a.id === Number(params.accountId));
    if (!found) return fail(404, "NOT_FOUND", "Không tìm thấy tài khoản.");
    Object.assign(found, body);
    return HttpResponse.json(found);
  }),
  http.post(url("/accounts/:accountId/lock"), ({ params }) => {
    const found = accounts.find((a) => a.id === Number(params.accountId));
    if (found) found.is_active = false;
    return HttpResponse.json({ message: "Đã khoá tài khoản." });
  }),
  http.post(url("/accounts/:accountId/unlock"), ({ params }) => {
    const found = accounts.find((a) => a.id === Number(params.accountId));
    if (found) found.is_active = true;
    return HttpResponse.json({ message: "Đã mở khoá tài khoản." });
  }),
  http.post(url("/accounts/:accountId/send-password-reset"), () =>
    HttpResponse.json({ message: "Đã gửi liên kết đặt mật khẩu." }),
  ),

  /* public -------------------------------------------------------------- */

  http.get(url("/public/trainers"), () =>
    HttpResponse.json(
      trainers
        .filter((t) => t.is_public && t.is_active)
        .map((t) => ({ full_name: t.full_name, photo_key: t.photo_key, bio: t.bio })),
    ),
  ),
  http.get(url("/public/schedule"), ({ request }) => {
    const days = num(request, "days") ?? 14;
    const until = at(days, "23:59");
    const now = new Date().toISOString();

    return HttpResponse.json(
      classes
        .filter(
          (item) =>
            item.status === "SCHEDULED" && item.starts_at > now && item.starts_at <= until,
        )
        .map((item) => ({
          starts_at: item.starts_at,
          ends_at: item.ends_at,
          class_type: item.class_type,
          trainer_name:
            trainers.find((t) => t.id === item.trainer_id)?.full_name ?? "DEMO HLV",
          is_full: heldCount(item.id) >= item.capacity,
        })),
    );
  }),
  http.get(url("/public/packages"), () =>
    HttpResponse.json(
      packageTypes
        .filter((p) => p.is_selling)
        .map((p) => ({
          name: p.name,
          price: p.price,
          credits: p.credits,
          duration_days: p.duration_days,
          class_type: p.class_type,
        })),
    ),
  ),
  http.get(url("/public/announcements"), () =>
    HttpResponse.json(
      announcements
        .filter((a) => a.is_published)
        .map((a) => ({ title: a.title, body: a.body, publish_at: a.publish_at })),
    ),
  ),
  http.post(url("/public/leads"), async ({ request }) => {
    const body = (await request.json()) as {
      full_name: string;
      phone: string;
      need?: string | null;
      source?: string | null;
    };
    leads.unshift({
      id: newId(),
      full_name: body.full_name,
      phone: body.phone,
      need: body.need ?? null,
      source: body.source ?? null,
      status: "NEW",
      assigned_to: null,
      converted_student_id: null,
      created_at: new Date().toISOString(),
    });
    return HttpResponse.json(
      { message: "Đã nhận thông tin. Studio sẽ liên hệ lại." },
      { status: 201 },
    );
  }),

  /* leads --------------------------------------------------------------- */

  http.get(url("/leads"), ({ request }) => {
    const status = str(request, "status");
    return HttpResponse.json(
      status === null ? leads : leads.filter((lead) => lead.status === status),
    );
  }),
  http.get(url("/leads/:leadId"), ({ params }) => {
    const found = leads.find((lead) => lead.id === Number(params.leadId));
    return found ? HttpResponse.json(found) : fail(404, "NOT_FOUND", "Không tìm thấy.");
  }),
  http.patch(url("/leads/:leadId"), async ({ params, request }) => {
    const body = (await request.json()) as LeadUpdateRequest;
    const found = leads.find((lead) => lead.id === Number(params.leadId));
    if (!found) return fail(404, "NOT_FOUND", "Không tìm thấy.");
    if (body.status != null) found.status = body.status;
    if (body.need !== undefined) found.need = body.need;
    if (body.assigned_to !== undefined) found.assigned_to = body.assigned_to;
    return HttpResponse.json(found);
  }),
  http.post(url("/leads/:leadId/convert"), ({ params }) => {
    const lead = leads.find((item) => item.id === Number(params.leadId));
    if (!lead) return fail(404, "NOT_FOUND", "Không tìm thấy.");
    if (students.some((s) => s.phone === lead.phone)) {
      return fail(409, "STUDENT_PHONE_TAKEN", "Số điện thoại này đã có hồ sơ học viên.");
    }
    const student = {
      id: newId(),
      user_id: null,
      full_name: lead.full_name,
      phone: lead.phone,
      email: null,
      dob: null,
      note: lead.need,
      status: "ACTIVE" as const,
      created_at: new Date().toISOString(),
    };
    students.push(student);
    lead.status = "CONVERTED";
    lead.converted_student_id = student.id;
    return HttpResponse.json(student, { status: 201 });
  }),

  /* students ------------------------------------------------------------ */

  http.get(url("/students"), ({ request }) => {
    const q = str(request, "q")?.toLowerCase();
    const status = str(request, "status");
    return HttpResponse.json(
      students
        .filter((s) => status === null || s.status === status)
        .filter(
          (s) =>
            q === undefined || s.full_name.toLowerCase().includes(q) || s.phone.includes(q),
        ),
    );
  }),
  http.get(url("/students/:studentId"), ({ params }) => {
    const found = students.find((s) => s.id === Number(params.studentId));
    return found
      ? HttpResponse.json(found)
      : fail(404, "NOT_FOUND", "Không tìm thấy học viên.");
  }),
  http.post(url("/students"), async ({ request }) => {
    const body = (await request.json()) as StudentCreateRequest;
    if (students.some((s) => s.phone === body.phone)) {
      return fail(409, "STUDENT_PHONE_TAKEN", "Số điện thoại này đã có hồ sơ học viên.");
    }
    const created = {
      id: newId(),
      user_id: null,
      full_name: body.full_name,
      phone: body.phone,
      email: body.email ?? null,
      dob: body.dob ?? null,
      note: body.note ?? null,
      status: "ACTIVE" as const,
      created_at: new Date().toISOString(),
    };
    students.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch(url("/students/:studentId"), async ({ params, request }) => {
    const body = (await request.json()) as StudentUpdateRequest;
    const found = students.find((s) => s.id === Number(params.studentId));
    if (!found) return fail(404, "NOT_FOUND", "Không tìm thấy học viên.");
    Object.assign(
      found,
      Object.fromEntries(Object.entries(body).filter(([, v]) => v != null)),
    );
    return HttpResponse.json(found);
  }),
  http.get(url("/students/:studentId/overview"), ({ params }) => {
    const studentId = Number(params.studentId);
    const student = students.find((s) => s.id === studentId);
    if (!student) return fail(404, "NOT_FOUND", "Không tìm thấy học viên.");

    const active = packages.filter(
      (item) => item.student_id === studentId && item.status === "ACTIVE",
    );
    const credits = active.reduce((sum, item) => sum + item.balance_cached, 0);

    return HttpResponse.json({
      student,
      credits_remaining: credits,
      active_packages: active.map((item) => ({
        id: item.id,
        name: item.name_snapshot,
        class_type: item.class_type_snapshot,
        price: item.price_snapshot,
        start_date: item.start_date,
        end_date: item.end_date,
        credits_remaining: item.balance_cached,
        days_remaining: Math.max(
          0,
          Math.round(
            (new Date(`${item.end_date}T00:00:00+07:00`).getTime() - Date.now()) /
              86_400_000,
          ),
        ),
      })),
      needs_renewal: credits <= 6,
    });
  }),

  /* progress photos ----------------------------------------------------- */

  http.get(url("/students/:studentId/progress-photos"), ({ params }) => {
    if (isStaff() && demoRole() !== "ADMIN") {
      return fail(403, "FORBIDDEN", "Bạn không xem được ảnh tiến trình.");
    }
    return HttpResponse.json(
      DEMO_PHOTOS.filter((photo) => photo.student_id === Number(params.studentId)),
    );
  }),
  http.post(url("/students/:studentId/progress-photos"), ({ params }) =>
    HttpResponse.json(
      {
        id: newId(),
        student_id: Number(params.studentId),
        taken_at: new Date().toISOString(),
        uploaded_by: DEMO_USERS[demoRole()].id,
        created_at: new Date().toISOString(),
      },
      { status: 201 },
    ),
  ),
  http.delete(url("/students/:studentId/progress-photos/:photoId"), () =>
    HttpResponse.json(null, { status: 204 }),
  ),
  http.get(url("/students/:studentId/progress-photos/:photoId/file"), () =>
    fail(404, "NO_PHOTO", "Bản demo không có tệp ảnh."),
  ),

  /* trainers ------------------------------------------------------------ */

  http.get(url("/trainers"), ({ request }) => {
    const active = str(request, "is_active");
    return HttpResponse.json(
      active === null ? trainers : trainers.filter((t) => String(t.is_active) === active),
    );
  }),
  http.get(url("/trainers/:trainerId"), ({ params }) => {
    const found = trainers.find((t) => t.id === Number(params.trainerId));
    return found ? HttpResponse.json(found) : fail(404, "NOT_FOUND", "Không tìm thấy.");
  }),
  http.post(url("/trainers"), async ({ request }) => {
    const body = (await request.json()) as TrainerCreateRequest;
    const created = {
      id: newId(),
      full_name: body.full_name,
      phone: body.phone ?? null,
      bio: body.bio ?? null,
      specialties: body.specialties ?? null,
      photo_key: null,
      is_public: body.is_public ?? false,
      is_active: true,
      user_id: body.user_id ?? null,
      created_at: new Date().toISOString(),
    };
    trainers.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch(url("/trainers/:trainerId"), async ({ params, request }) => {
    const body = (await request.json()) as TrainerUpdateRequest;
    const found = trainers.find((t) => t.id === Number(params.trainerId));
    if (!found) return fail(404, "NOT_FOUND", "Không tìm thấy.");
    Object.assign(
      found,
      Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)),
    );
    return HttpResponse.json(found);
  }),
  http.get(url("/trainers/:trainerId/photo"), () =>
    fail(404, "NO_PHOTO", "Huấn luyện viên chưa có ảnh."),
  ),
  http.post(url("/trainers/:trainerId/photo"), ({ params }) => {
    const found = trainers.find((t) => t.id === Number(params.trainerId));
    return found ? HttpResponse.json(found) : fail(404, "NOT_FOUND", "Không tìm thấy.");
  }),

  /* announcements ------------------------------------------------------- */

  http.get(url("/announcements"), () => HttpResponse.json(announcements)),
  http.post(url("/announcements"), async ({ request }) => {
    const body = (await request.json()) as AnnouncementCreateRequest;
    const created = {
      id: newId(),
      title: body.title,
      body: body.body,
      is_published: body.is_published ?? false,
      publish_at: body.publish_at ?? null,
      created_by: DEMO_USERS[demoRole()].id,
      created_at: new Date().toISOString(),
      updated_at: null,
      updated_by: null,
    };
    announcements.unshift(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch(url("/announcements/:id"), async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const found = announcements.find((a) => a.id === Number(params.id));
    if (!found) return fail(404, "NOT_FOUND", "Không tìm thấy.");
    Object.assign(found, body);
    return HttpResponse.json(found);
  }),
  http.delete(url("/announcements/:id"), () => HttpResponse.json(null, { status: 204 })),

  /* package types and packages ------------------------------------------ */

  http.get(url("/package-types"), ({ request }) => {
    const selling = str(request, "is_selling");
    return HttpResponse.json(
      selling === null
        ? packageTypes
        : packageTypes.filter((p) => String(p.is_selling) === selling),
    );
  }),
  http.post(url("/package-types"), async ({ request }) => {
    const body = (await request.json()) as PackageTypeCreateRequest;
    const created = {
      id: newId(),
      name: body.name,
      price: body.price == null ? null : String(body.price),
      credits: body.credits,
      duration_days: body.duration_days,
      class_type: body.class_type,
      is_selling: body.is_selling ?? true,
    };
    packageTypes.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch(url("/package-types/:id"), async ({ params, request }) => {
    const body = (await request.json()) as PackageTypeUpdateRequest;
    const found = packageTypes.find((p) => p.id === Number(params.id));
    if (!found) return fail(404, "NOT_FOUND", "Không tìm thấy.");
    if (body.is_selling != null) found.is_selling = body.is_selling;
    if (body.name != null) found.name = body.name;
    if (body.price !== undefined)
      found.price = body.price == null ? null : String(body.price);
    if (body.credits != null) found.credits = body.credits;
    if (body.duration_days != null) found.duration_days = body.duration_days;
    return HttpResponse.json(found);
  }),

  http.get(url("/packages"), ({ request }) => {
    const studentId = num(request, "student_id") ?? DEMO_USERS[demoRole()].student_id;
    return HttpResponse.json(
      studentId == null
        ? packages
        : packages.filter((item) => item.student_id === studentId),
    );
  }),
  http.post(url("/packages/sell"), async ({ request }) => {
    const body = (await request.json()) as SellPackageRequest;
    const type = packageTypes.find((p) => p.id === body.package_type_id);
    if (!type) return fail(404, "NOT_FOUND", "Không tìm thấy loại gói.");

    const start = body.start_date ?? dayKey(0);
    const created: StudentPackageResponse = {
      id: newId(),
      student_id: body.student_id,
      package_type_id: type.id,
      name_snapshot: type.name,
      price_snapshot: type.price ?? "0.00",
      credits_snapshot: type.credits,
      class_type_snapshot: type.class_type,
      start_date: start,
      end_date: dayKey(type.duration_days),
      status: "ACTIVE",
      balance_cached: type.credits,
      created_at: new Date().toISOString(),
    };
    packages.push(created);
    addLedgerEntry(type.credits, "PACKAGE_SOLD", type.credits, null);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.post(url("/packages/:id/renew"), async ({ params, request }) => {
    const body = (await request.json()) as RenewPackageRequest;
    const found = packages.find((p) => p.id === Number(params.id));
    if (!found) return fail(404, "NOT_FOUND", "Không tìm thấy gói.");
    found.balance_cached += body.extra_credits ?? 0;
    addLedgerEntry(
      body.extra_credits ?? 0,
      "PACKAGE_RENEWED",
      found.balance_cached,
      null,
      body.note ?? null,
    );
    return HttpResponse.json(found);
  }),
  http.post(url("/packages/:id/adjust"), async ({ params, request }) => {
    const body = (await request.json()) as { delta: number; reason: string };
    const found = packages.find((p) => p.id === Number(params.id));
    if (!found) return fail(404, "NOT_FOUND", "Không tìm thấy gói.");
    if (body.delta === 0) return fail(409, "ZERO_DELTA", "Điều chỉnh phải khác 0.");
    found.balance_cached = Math.max(0, found.balance_cached + body.delta);
    addLedgerEntry(body.delta, "ADMIN_ADJUST", found.balance_cached, null, body.reason);
    return HttpResponse.json(found);
  }),
  http.get(url("/packages/:id/ledger"), ({ params }) => {
    const found = packages.find((p) => p.id === Number(params.id));
    if (!found) return fail(404, "NOT_FOUND", "Không tìm thấy gói.");
    return HttpResponse.json({
      student_package_id: found.id,
      entries: ledger,
      closing_balance: ledger.at(-1)?.balance_after ?? 0,
    });
  }),

  /* payments ------------------------------------------------------------ */

  http.get(url("/payments"), ({ request }) => {
    const status = str(request, "status");
    const studentId = num(request, "student_id");
    const ownedPackages = new Set(
      packages
        .filter((p) => studentId === null || p.student_id === studentId)
        .map((p) => p.id),
    );
    return HttpResponse.json(
      payments
        .filter((p) => status === null || p.status === status)
        .filter((p) => studentId === null || ownedPackages.has(p.student_package_id)),
    );
  }),
  http.get(url("/payments/:id"), ({ params }) => {
    const found = payments.find((p) => p.id === Number(params.id));
    return found ? HttpResponse.json(found) : fail(404, "NOT_FOUND", "Không tìm thấy.");
  }),
  http.post(url("/payments"), async ({ request }) => {
    const body = (await request.json()) as RecordPaymentRequest;
    const created: PaymentResponse = {
      id: newId(),
      student_package_id: body.student_package_id,
      amount: String(body.amount),
      method: body.method,
      status: "PENDING",
      note: body.note ?? null,
      recorded_by: DEMO_USERS[demoRole()].id,
      recorded_at: new Date().toISOString(),
      confirmed_by: null,
      confirmed_at: null,
      voided_by: null,
      voided_at: null,
      void_reason: null,
    };
    payments.unshift(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.post(url("/payments/:id/confirm"), ({ params }) => {
    const found = payments.find((p) => p.id === Number(params.id));
    if (!found) return fail(404, "NOT_FOUND", "Không tìm thấy.");
    found.status = "CONFIRMED";
    found.confirmed_by = DEMO_USERS[demoRole()].id;
    found.confirmed_at = new Date().toISOString();
    return HttpResponse.json(found);
  }),
  http.post(url("/payments/:id/void"), async ({ params, request }) => {
    const body = (await request.json()) as { reason: string };
    const found = payments.find((p) => p.id === Number(params.id));
    if (!found) return fail(404, "NOT_FOUND", "Không tìm thấy.");
    if (found.status === "VOID") {
      return fail(409, "PAYMENT_ALREADY_VOID", "Phiếu này đã được huỷ.");
    }
    found.status = "VOID";
    found.voided_by = DEMO_USERS[demoRole()].id;
    found.voided_at = new Date().toISOString();
    found.void_reason = body.reason;
    return HttpResponse.json(found);
  }),

  /* classes ------------------------------------------------------------- */

  http.get(url("/classes"), ({ request }) => {
    const from = str(request, "starts_from");
    const to = str(request, "starts_to");
    const trainerId = num(request, "trainer_id");
    const classType = str(request, "class_type");
    const status = str(request, "status");

    return HttpResponse.json(
      classes
        .filter((item) => from === null || item.starts_at >= new Date(from).toISOString())
        .filter((item) => to === null || item.starts_at < new Date(to).toISOString())
        .filter((item) => trainerId === null || item.trainer_id === trainerId)
        .filter((item) => classType === null || item.class_type === classType)
        .filter((item) => status === null || item.status === status),
    );
  }),
  http.get(url("/classes/my-schedule"), ({ request }) => {
    const from = str(request, "starts_from");
    const to = str(request, "starts_to");
    const trainerId = DEMO_USERS[demoRole()].trainer_id ?? 1;
    return HttpResponse.json(
      classes
        .filter((item) => item.trainer_id === trainerId)
        .filter((item) => from === null || item.starts_at >= new Date(from).toISOString())
        .filter((item) => to === null || item.starts_at < new Date(to).toISOString()),
    );
  }),
  http.get(url("/classes/trainer-stats"), ({ request }) => {
    const trainerId = num(request, "trainer_id") ?? 1;
    const mine = classes.filter((item) => item.trainer_id === trainerId);
    return HttpResponse.json({
      trainer_id: trainerId,
      year: num(request, "year") ?? new Date().getFullYear(),
      month: num(request, "month") ?? new Date().getMonth() + 1,
      scheduled_sessions: mine.filter((i) => i.status === "SCHEDULED").length,
      cancelled_sessions: mine.filter((i) => i.status === "CANCELLED").length,
      total_bookings: bookings.filter((b) =>
        mine.some((item) => item.id === b.class_session_id),
      ).length,
    });
  }),
  http.post(url("/classes/recurrence/preview"), async ({ request }) => {
    const body = (await request.json()) as RecurrenceRequest;
    const occurrences = expandPattern(body).map((starts_at, index) => ({
      starts_at,
      ends_at: new Date(
        new Date(starts_at).getTime() + body.duration_minutes * 60_000,
      ).toISOString(),
      // Every fifth occurrence clashes, so the preview has something to show.
      conflict: index % 5 === 4 ? "Huấn luyện viên đã có lớp trùng giờ." : null,
    }));
    return HttpResponse.json({
      occurrences,
      available_count: occurrences.filter((o) => o.conflict === null).length,
      conflict_count: occurrences.filter((o) => o.conflict !== null).length,
    });
  }),
  http.post(url("/classes/recurrence"), async ({ request }) => {
    const body = (await request.json()) as RecurrenceRequest;
    const created = expandPattern(body)
      .filter((_, index) => index % 5 !== 4)
      .map((starts_at) => {
        const session: ClassSessionResponse = {
          id: newId(),
          starts_at,
          ends_at: new Date(
            new Date(starts_at).getTime() + body.duration_minutes * 60_000,
          ).toISOString(),
          trainer_id: body.trainer_id,
          class_type: body.class_type,
          capacity: body.capacity ?? 6,
          status: "SCHEDULED",
          recurrence_id: `demo-${newId()}`,
          cancel_reason: null,
        };
        classes.push(session);
        return session;
      });

    return HttpResponse.json(
      { recurrence_id: created[0]?.recurrence_id ?? "demo", sessions: created },
      { status: 201 },
    );
  }),
  http.get(url("/classes/:sessionId/attendance"), ({ params }) => {
    const sessionId = Number(params.sessionId);
    return HttpResponse.json(
      bookings
        .filter(
          (booking) =>
            booking.class_session_id === sessionId &&
            booking.status !== "CANCELLED_INTIME" &&
            booking.status !== "CANCELLED_LATE",
        )
        .map((booking) => ({
          id: booking.id,
          class_session_id: booking.class_session_id,
          student_id: booking.student_id,
          status: booking.status,
          attendance_marked_by: booking.status === "BOOKED" ? null : 3,
          attendance_marked_at: booking.status === "BOOKED" ? null : booking.created_at,
          student_name:
            students.find((s) => s.id === booking.student_id)?.full_name ?? "DEMO",
        })),
    );
  }),
  http.post(url("/classes/:sessionId/cancel"), async ({ params, request }) => {
    const body = (await request.json()) as CancelSessionRequest;
    const session = sessionOf(Number(params.sessionId));
    if (!session) return fail(404, "NOT_FOUND", "Không tìm thấy buổi lớp.");
    session.status = "CANCELLED";
    session.cancel_reason = body.reason;

    const refunded = bookings.filter(
      (b) => b.class_session_id === session.id && b.status === "BOOKED",
    );
    for (const booking of refunded) booking.status = "CANCELLED_INTIME";

    return HttpResponse.json({
      session_id: session.id,
      refunded_booking_ids: refunded.map((b) => b.id),
      cancelled_waitlist_ids: [],
    });
  }),
  http.post(url("/classes/:sessionId/trainer"), async ({ params, request }) => {
    const body = (await request.json()) as { trainer_id: number };
    const session = sessionOf(Number(params.sessionId));
    if (!session) return fail(404, "NOT_FOUND", "Không tìm thấy buổi lớp.");
    if (body.trainer_id === 2) {
      return fail(409, "TRAINER_DOUBLE_BOOKED", "Huấn luyện viên đã có lớp trùng giờ.");
    }
    session.trainer_id = body.trainer_id;
    return HttpResponse.json(session);
  }),
  http.post(url("/classes"), async ({ request }) => {
    const body = (await request.json()) as ClassCreateRequest;
    const created: ClassSessionResponse = {
      id: newId(),
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      trainer_id: body.trainer_id,
      class_type: body.class_type,
      capacity: body.capacity ?? 6,
      status: "SCHEDULED",
      recurrence_id: null,
      cancel_reason: null,
    };
    classes.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  // Registered after the literal `/classes/...` paths so those win.
  http.get(url("/classes/:sessionId"), ({ params }) => {
    const session = sessionOf(Number(params.sessionId));
    if (!session) return fail(404, "NOT_FOUND", "Không tìm thấy buổi lớp.");

    const booked = heldCount(session.id);
    const student = demoRole() === "STUDENT";
    return HttpResponse.json({
      ...session,
      booked_count: student ? 0 : booked,
      seats_left: student
        ? booked < session.capacity
          ? 1
          : 0
        : Math.max(session.capacity - booked, 0),
      trainer_name:
        trainers.find((t) => t.id === session.trainer_id)?.full_name ?? "DEMO HLV",
    });
  }),

  /* bookings ------------------------------------------------------------ */

  http.get(url("/bookings"), ({ request }) => {
    const sessionId = num(request, "class_session_id");
    const heldOnly = str(request, "held_only") === "true";
    return HttpResponse.json(
      bookings
        .filter((b) => sessionId === null || b.class_session_id === sessionId)
        .filter(
          (b) =>
            !heldOnly ||
            b.status === "BOOKED" ||
            b.status === "ATTENDED" ||
            b.status === "NO_SHOW",
        ),
    );
  }),
  http.post(url("/bookings"), async ({ request }) => {
    const body = (await request.json()) as BookingCreateRequest;
    const session = sessionOf(body.class_session_id);
    if (!session) return fail(404, "NOT_FOUND", "Không tìm thấy buổi lớp.");
    if (session.status === "CANCELLED") {
      return fail(409, "SESSION_CANCELLED", "Buổi lớp đã bị hủy.");
    }
    if (heldCount(session.id) >= session.capacity) {
      return fail(409, "SESSION_FULL", "Buổi lớp đã hết chỗ.");
    }

    const studentId = DEMO_USERS[demoRole()].student_id ?? 1;
    const pack = packageFor(studentId);
    if (!pack) return fail(409, "PACKAGE_OUT_OF_CREDITS", "Gói tập đã hết buổi.");

    const booking: BookingResponse = {
      id: newId(),
      class_session_id: session.id,
      student_id: studentId,
      student_package_id: pack.id,
      status: "BOOKED",
      created_at: new Date().toISOString(),
    };
    bookings.push(booking);
    pack.balance_cached -= 1;
    addLedgerEntry(-1, "BOOKING_DEDUCT", pack.balance_cached, booking.id);

    return HttpResponse.json(
      {
        booking,
        student_package_id: pack.id,
        credits_remaining: pack.balance_cached,
      },
      { status: 201 },
    );
  }),
  http.post(url("/bookings/:bookingId/cancel"), ({ params }) => {
    const booking = bookings.find((b) => b.id === Number(params.bookingId));
    if (!booking) return fail(404, "NOT_FOUND", "Không tìm thấy đăng ký.");
    const session = sessionOf(booking.class_session_id);
    const pack = packages.find((p) => p.id === booking.student_package_id);
    if (!session || !pack) return fail(404, "NOT_FOUND", "Không tìm thấy.");

    const inTime = new Date(cancelDeadline(session)).getTime() > Date.now();
    if (!inTime) {
      return fail(
        409,
        "CANCELLATION_CLOSED",
        "Đã quá hạn hủy của lớp, không thể hủy hoặc đổi lớp.",
      );
    }

    booking.status = "CANCELLED_INTIME";
    pack.balance_cached += 1;
    addLedgerEntry(1, "CANCEL_REFUND", pack.balance_cached, booking.id);

    return HttpResponse.json({
      booking_id: booking.id,
      status: booking.status,
      refunded: true,
      credits_remaining: pack.balance_cached,
    });
  }),
  http.post(url("/bookings/:bookingId/change"), async ({ params, request }) => {
    const body = (await request.json()) as ChangeBookingRequest;
    const booking = bookings.find((b) => b.id === Number(params.bookingId));
    const target = sessionOf(body.new_class_session_id);
    const pack = packages.find((p) => p.id === booking?.student_package_id);
    if (!booking || !target || !pack) return fail(404, "NOT_FOUND", "Không tìm thấy.");
    if (heldCount(target.id) >= target.capacity) {
      return fail(409, "SESSION_FULL", "Buổi lớp đã hết chỗ.");
    }

    const cancelled = { ...booking, status: "CANCELLED_INTIME" as const };
    booking.status = "CANCELLED_INTIME";

    const created: BookingResponse = {
      id: newId(),
      class_session_id: target.id,
      student_id: booking.student_id,
      student_package_id: pack.id,
      status: "BOOKED",
      created_at: new Date().toISOString(),
    };
    bookings.push(created);

    return HttpResponse.json({
      cancelled: {
        booking_id: cancelled.id,
        status: cancelled.status,
        refunded: true,
        credits_remaining: pack.balance_cached,
      },
      booked: {
        booking: created,
        student_package_id: pack.id,
        credits_remaining: pack.balance_cached,
      },
    });
  }),
  http.patch(url("/bookings/:bookingId/attendance"), async ({ params, request }) => {
    const body = (await request.json()) as AttendanceRequest;
    const booking = bookings.find((b) => b.id === Number(params.bookingId));
    if (!booking) return fail(404, "NOT_FOUND", "Không tìm thấy đăng ký.");
    const session = sessionOf(booking.class_session_id);
    if (session && new Date(session.ends_at).getTime() > Date.now()) {
      return fail(409, "SESSION_NOT_FINISHED", "Lớp chưa kết thúc, chưa điểm danh được.");
    }

    booking.status = body.status;
    return HttpResponse.json({
      id: booking.id,
      class_session_id: booking.class_session_id,
      student_id: booking.student_id,
      status: booking.status,
      attendance_marked_by: DEMO_USERS[demoRole()].id,
      attendance_marked_at: new Date().toISOString(),
    });
  }),

  /* my schedule --------------------------------------------------------- */

  http.get(url("/my-schedule"), ({ request }) => {
    const studentId = num(request, "student_id") ?? DEMO_USERS[demoRole()].student_id ?? 1;
    return HttpResponse.json(
      myScheduleItems(studentId, str(request, "include_cancelled") === "true"),
    );
  }),
  http.get(url("/my-schedule/bookable"), ({ request }) => {
    const studentId = num(request, "student_id") ?? DEMO_USERS[demoRole()].student_id ?? 1;
    const pack = packageFor(studentId);
    if (!pack) return HttpResponse.json([]);

    const mine = new Set(
      bookings
        .filter((b) => b.student_id === studentId && b.status === "BOOKED")
        .map((b) => b.class_session_id),
    );
    const now = new Date().toISOString();

    return HttpResponse.json(
      classes
        .filter(
          (item) =>
            item.status === "SCHEDULED" &&
            item.starts_at > now &&
            item.class_type === pack.class_type_snapshot &&
            heldCount(item.id) < item.capacity &&
            !mine.has(item.id),
        )
        .map((item) => item.id),
    );
  }),

  /* renewals ------------------------------------------------------------ */

  http.get(url("/renewals"), () =>
    HttpResponse.json(
      packages
        .filter((item) => item.status === "ACTIVE" && item.balance_cached <= 6)
        .map((item) => {
          const student = students.find((s) => s.id === item.student_id);
          const last = contacts
            .filter((c) => c.student_id === item.student_id)
            .sort((a, b) => b.contacted_at.localeCompare(a.contacted_at))[0];

          return {
            student_id: item.student_id,
            student_name: student?.full_name ?? "DEMO",
            student_phone: student?.phone ?? "",
            student_package_id: item.id,
            package_name: item.name_snapshot,
            credits_remaining: item.balance_cached,
            end_date: item.end_date,
            days_remaining: Math.max(
              0,
              Math.round(
                (new Date(`${item.end_date}T00:00:00+07:00`).getTime() - Date.now()) /
                  86_400_000,
              ),
            ),
            reasons: item.balance_cached <= 6 ? ["low_credits"] : ["expiring_soon"],
            last_contacted_at: last?.contacted_at ?? null,
            last_contact_result: last?.result ?? null,
            next_contact_date: last?.next_contact_date ?? null,
          };
        }),
    ),
  ),
  http.get(url("/renewals/summary"), () => {
    const due = packages.filter((p) => p.status === "ACTIVE" && p.balance_cached <= 6);
    return HttpResponse.json({
      needing_contact: due.length,
      low_credits: due.filter((p) => p.balance_cached <= 6).length,
      expiring_soon: 0,
      never_contacted: due.filter(
        (p) => !contacts.some((c) => c.student_id === p.student_id),
      ).length,
    });
  }),
  http.post(url("/renewals/contacts"), async ({ request }) => {
    const body = (await request.json()) as RenewalContactRequest;
    const created = {
      id: newId(),
      student_id: body.student_id,
      contacted_at: new Date().toISOString(),
      result: body.result,
      next_contact_date: body.next_contact_date ?? null,
      actor_user_id: DEMO_USERS[demoRole()].id,
    };
    contacts.unshift(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.get(url("/renewals/students/:studentId/contacts"), ({ params }) =>
    HttpResponse.json(contacts.filter((c) => c.student_id === Number(params.studentId))),
  ),

  /* reports ------------------------------------------------------------- */

  http.get(url("/reports/dashboard"), () => {
    const today = dayKey(0);
    const todays = classes.filter((item) => item.starts_at.startsWith(today));
    const now = Date.now();
    const needing = classes.filter(
      (item) =>
        new Date(item.ends_at).getTime() < now &&
        bookings.some((b) => b.class_session_id === item.id && b.status === "BOOKED"),
    );

    const row = (item: ClassSessionResponse) => ({
      class_session_id: item.id,
      starts_at: item.starts_at,
      trainer_name: trainers.find((t) => t.id === item.trainer_id)?.full_name ?? "DEMO HLV",
      capacity: item.capacity,
      booked_count: heldCount(item.id),
      status: item.status,
    });

    return HttpResponse.json({
      numbers: [
        {
          key: "sessions_today",
          label: "Lớp hôm nay",
          value: todays.length,
          detail_path: "/classes",
        },
        {
          key: "bookings_today",
          label: "Lượt đăng ký hôm nay",
          value: todays.reduce((sum, item) => sum + heldCount(item.id), 0),
          detail_path: "/bookings?held_only=true",
        },
        {
          key: "renewals_due",
          label: "Cần gia hạn",
          value: packages.filter((p) => p.balance_cached <= 6).length,
          detail_path: "/renewals",
        },
        {
          key: "unconfirmed_payments",
          label: "Thanh toán chờ xác nhận",
          value: payments.filter((p) => p.status === "PENDING").length,
          detail_path: "/reports/unconfirmed-payments",
        },
      ],
      sessions_needing_attention: needing.map(row),
      sessions_today: todays.map(row),
    });
  }),
  http.get(url("/reports/revenue"), ({ request }) => {
    const confirmed = payments.filter((p) => p.status === "CONFIRMED");
    const total = confirmed.reduce((sum, p) => sum + Number(p.amount), 0);
    const byMethod = (["CASH", "TRANSFER"] as const).map((method) => {
      const rows = confirmed.filter((p) => p.method === method);
      return {
        method,
        total: rows.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2),
        payment_count: rows.length,
      };
    });

    return HttpResponse.json({
      period_start: str(request, "period_start") ?? dayKey(-30),
      period_end: str(request, "period_end") ?? dayKey(0),
      total: total.toFixed(2),
      payment_count: confirmed.length,
      by_method: byMethod,
      detail_path: "/reports/revenue/detail",
    });
  }),
  http.get(url("/reports/revenue/detail"), () =>
    HttpResponse.json(
      payments
        .filter((p) => p.status === "CONFIRMED")
        .map((p) => ({
          payment_id: p.id,
          confirmed_at: p.confirmed_at ?? p.recorded_at,
          student_name:
            students.find((s) =>
              packages.some(
                (pack) => pack.id === p.student_package_id && pack.student_id === s.id,
              ),
            )?.full_name ?? "DEMO",
          package_name:
            packages.find((pack) => pack.id === p.student_package_id)?.name_snapshot ??
            "DEMO",
          amount: p.amount,
          method: p.method,
        })),
    ),
  ),
  http.get(url("/reports/classes"), ({ request }) => {
    const scheduled = classes.filter((item) => item.status === "SCHEDULED");
    const capacity = scheduled.reduce((sum, item) => sum + item.capacity, 0);
    const booked = scheduled.reduce((sum, item) => sum + heldCount(item.id), 0);

    return HttpResponse.json({
      period_start: str(request, "period_start") ?? dayKey(-30),
      period_end: str(request, "period_end") ?? dayKey(0),
      scheduled_sessions: scheduled.length,
      cancelled_sessions: classes.length - scheduled.length,
      total_bookings: booked,
      total_capacity: capacity,
      fill_rate: capacity === 0 ? null : booked / capacity,
      detail_path: "/classes",
    });
  }),
  http.get(url("/reports/trainers"), () =>
    HttpResponse.json(
      trainers.map((trainer) => {
        const mine = classes.filter((item) => item.trainer_id === trainer.id);
        return {
          trainer_id: trainer.id,
          trainer_name: trainer.full_name,
          scheduled_sessions: mine.filter((i) => i.status === "SCHEDULED").length,
          cancelled_sessions: mine.filter((i) => i.status === "CANCELLED").length,
          total_bookings: mine.reduce((sum, item) => sum + heldCount(item.id), 0),
        };
      }),
    ),
  ),
  http.get(url("/reports/trainers/class-sizes"), () =>
    HttpResponse.json(
      trainers.map((trainer) => {
        const mine = classes.filter(
          (item) => item.trainer_id === trainer.id && item.status === "SCHEDULED",
        );
        const sized = (size: number) =>
          mine.filter((item) => heldCount(item.id) === size).length;

        return {
          trainer_id: trainer.id,
          trainer_name: trainer.full_name,
          size_1: sized(1),
          size_2: sized(2),
          size_3: sized(3),
          size_4: sized(4),
          size_5: sized(5),
          sessions_over_max: mine.filter((item) => heldCount(item.id) > 5).length,
          sessions_empty: sized(0),
          total_sessions: mine.length,
        };
      }),
    ),
  ),
  http.get(url("/reports/trainers/export"), () =>
    HttpResponse.text("Huấn luyện viên;Lớp đã xếp\r\nDEMO;0\r\n"),
  ),
  http.get(url("/reports/trainers/class-sizes/export"), () =>
    HttpResponse.text("Huấn luyện viên;1;2;3;4;5\r\nDEMO;0;0;0;0;0\r\n"),
  ),
  http.get(url("/reports/unconfirmed-payments"), () =>
    HttpResponse.json(
      payments
        .filter((p) => p.status === "PENDING")
        .map((p) => {
          const pack = packages.find((item) => item.id === p.student_package_id);
          return {
            payment_id: p.id,
            student_id: pack?.student_id ?? 0,
            student_name:
              students.find((s) => s.id === pack?.student_id)?.full_name ?? "DEMO",
            student_package_id: p.student_package_id,
            package_name: pack?.name_snapshot ?? "DEMO",
            amount: p.amount,
            recorded_at: p.recorded_at,
            days_pending: 7,
          };
        }),
    ),
  ),

  /* meta ---------------------------------------------------------------- */

  http.get(url("/health"), () => HttpResponse.json({ status: "ok" })),
];

/** Every occurrence a weekly pattern would produce, as instants. */
function expandPattern(pattern: RecurrenceRequest): string[] {
  const out: string[] = [];
  const start = new Date(`${pattern.start_date}T00:00:00+07:00`);
  const end = new Date(`${pattern.end_date}T00:00:00+07:00`);

  for (let day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    // The backend counts weekdays from Monday; `getUTCDay` counts from Sunday.
    const weekday = day.getUTCDay() === 0 ? 7 : day.getUTCDay();
    if (!pattern.weekdays.includes(weekday)) continue;
    const key = day.toISOString().slice(0, 10);
    out.push(`${key}T${pattern.start_time.slice(0, 5)}:00+07:00`);
  }

  return out;
}
