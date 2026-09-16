import { HttpResponse, http, type HttpHandler } from "msw";

import { CANCELLATION_POLICY } from "~/content/studio";
import { API_BASE } from "~/lib/api/client";
import type {
  Booking,
  BookingEligibility,
  ClassInput,
  RecurringClassInput,
  ClassSession,
  PublicClassSession,
} from "~/lib/api/types";

import {
  buildDemoClasses,
  DEMO_PACKAGE,
  DEMO_STAFF,
  DEMO_STUDENT,
  DEMO_TRAINER_USER,
  DEMO_TRAINERS,
} from "./fixtures";

/**
 * A development stand-in for the authoritative backend.
 *
 * It exists so screens can be built and tested against the real API SHAPE.
 * It is not a specification: where the studio has not confirmed a rule (see
 * docs/OPEN_QUESTIONS.md) this returns the neutral value rather than guessing.
 */

export const url = (path: string) => `${API_BASE}${path}`;

export const classes: ClassSession[] = buildDemoClasses();
const bookedIds = new Set<string>();
let sessionsRemaining = DEMO_PACKAGE.sessionsRemaining;

export function findClass(id: string): ClassSession | undefined {
  return classes.find((item) => item.id === id);
}

/** The demo student's own balance, so the cancel handler can put a buổi back. */
export function adjustDemoStudentSessions(delta: number): void {
  sessionsRemaining = Math.max(0, sessionsRemaining + delta);
}

export function releaseBooking(classId: string): void {
  bookedIds.delete(classId);
}

let nextClassSeq = 1;

/** The instant a studio-local date and wall-clock time denote. */
function studioInstant(date: string, time: string, addMinutes = 0): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const base = new Date(`${date}T00:00:00+07:00`).getTime();
  return new Date(base + (h * 60 + m + addMinutes) * 60_000).toISOString();
}

/**
 * CONFIRMED (Q4): one trainer per class, and a reassignment must not double-book
 * a trainer. Half-open intervals, so a class ending at 07:20 and one starting at
 * 07:20 do not collide — back-to-back is how a studio actually runs.
 *
 * A cancelled class holds no trainer, so it is not a conflict.
 */
function trainerConflict(
  trainerId: string,
  startsAt: string,
  endsAt: string,
  exceptClassId?: string,
): ClassSession | undefined {
  const from = new Date(startsAt).getTime();
  const to = new Date(endsAt).getTime();
  return classes.find(
    (item) =>
      item.id !== exceptClassId &&
      item.trainer.id === trainerId &&
      item.status !== "cancelled" &&
      new Date(item.startsAt).getTime() < to &&
      from < new Date(item.endsAt).getTime(),
  );
}

function conflictResponse(clash: ClassSession) {
  return HttpResponse.json(
    {
      code: "trainer_conflict",
      message: "Huấn luyện viên đã có lớp trong khoảng giờ này",
      details: {
        classId: clash.id,
        title: clash.title,
        startsAt: clash.startsAt,
        endsAt: clash.endsAt,
        trainerName: clash.trainer.fullName,
      },
    },
    { status: 409 },
  );
}

/** ISO weekday, 1 = Monday … 7 = Sunday, for a studio-local date key. */
function isoWeekday(dateKey: string): number {
  const day = new Date(`${dateKey}T00:00:00+07:00`).getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * The dates a weekly pattern lands on. Walks the calendar a day at a time rather
 * than adding 7×n to a timestamp, so month and year boundaries take care of
 * themselves.
 */
function occurrences(from: string, until: string, weekdays: number[]): string[] {
  const out: string[] = [];
  const wanted = new Set(weekdays);
  const end = new Date(`${until}T00:00:00+07:00`).getTime();
  let cursor = new Date(`${from}T00:00:00+07:00`).getTime();
  // Hard stop well past the 26-week horizon the input allows, so a bad range
  // cannot spin here.
  for (let guard = 0; guard < 400 && cursor <= end; guard += 1) {
    const key = new Date(cursor).toISOString().slice(0, 10);
    if (wanted.has(isoWeekday(key))) out.push(key);
    cursor += 86_400_000;
  }
  return out;
}

/** Shared by create and edit; both reject the same way for the same reasons. */
function validateClassInput(
  body: Partial<ClassInput>,
  existing?: ClassSession,
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  if (!body.title?.trim()) fieldErrors.title = ["Nhập tên lớp"];
  if (!DEMO_TRAINERS.some((t) => t.id === body.trainerId)) {
    fieldErrors.trainerId = ["Chọn huấn luyện viên phụ trách"];
  }
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    fieldErrors.date = ["Chọn ngày"];
  }
  if (!body.startTime || !/^\d{2}:\d{2}$/.test(body.startTime)) {
    fieldErrors.startTime = ["Chọn giờ bắt đầu"];
  }
  if (!Number.isInteger(body.durationMinutes) || (body.durationMinutes ?? 0) < 15) {
    fieldErrors.durationMinutes = ["Thời lượng tối thiểu 15 phút"];
  }
  if (!Number.isInteger(body.capacity) || (body.capacity ?? 0) < 1) {
    fieldErrors.capacity = ["Sức chứa tối thiểu 1 người"];
  } else if (existing && body.capacity! < existing.bookedCount) {
    // Not a studio rule — arithmetic. A capacity below the number already booked
    // would mean evicting someone, and no form should do that silently.
    fieldErrors.capacity = [
      `Đã có ${existing.bookedCount} người đăng ký, không thể giảm sức chứa xuống dưới số đó`,
    ];
  }
  return fieldErrors;
}

function eligibilityFor(item: ClassSession): BookingEligibility {
  const reasons: string[] = [];
  if (bookedIds.has(item.id)) reasons.push("already_booked");
  if (item.status === "cancelled") reasons.push("class_cancelled");
  if (sessionsRemaining <= 0) reasons.push("no_sessions_remaining");
  if (item.bookedCount >= item.capacity) reasons.push("class_full");
  if (new Date(item.startsAt).getTime() < Date.now()) reasons.push("booking_closed");

  const canBook = reasons.length === 0;
  return {
    canBook,
    canJoinWaitlist:
      !canBook &&
      reasons.every((code) => code === "class_full") &&
      reasons.includes("class_full"),
    reasons: (canBook ? ["ok"] : reasons) as BookingEligibility["reasons"],
    sessionCost: canBook ? 1 : null,
  };
}

export function cancellationFor(item: ClassSession): Booking["cancellation"] {
  const policyHours = CANCELLATION_POLICY[item.type];
  const deadline = new Date(new Date(item.startsAt).getTime() - policyHours * 3_600_000);
  return {
    cancellable: new Date(item.startsAt).getTime() > Date.now(),
    refundable: deadline.getTime() > Date.now(),
    deadlineAt: deadline.toISOString(),
    policyHours,
  };
}

export function inRange(
  item: { startsAt: string },
  from: string | null,
  to: string | null,
) {
  if (from && item.startsAt < from) return false;
  if (to && item.startsAt > `${to}T23:59:59+07:00`) return false;
  return true;
}

export const handlers: HttpHandler[] = [
  /**
   * These three were being called by real screens with nothing answering them —
   * `/auth/login` from the sign-in form, `/auth/forgot-password` from the reset
   * request. In development that is a 404 behind a generic error message, which
   * is exactly the kind of gap a route-level state audit does not surface.
   */
  http.post(url("/auth/login"), async ({ request }) => {
    const body = (await request.json()) as { identifier?: string; password?: string };
    if (!body.password || !body.identifier) {
      return HttpResponse.json({ code: "validation_failed" }, { status: 422 });
    }
    // Development only: the identifier's prefix picks the role so all three
    // shells can be reached. Real authentication is a backend concern.
    const id = body.identifier.replace(/\s/g, "");
    if (id.startsWith("0258")) return HttpResponse.json(DEMO_STAFF);
    if (id.startsWith("0900100")) return HttpResponse.json(DEMO_TRAINER_USER);
    return HttpResponse.json(DEMO_STUDENT);
  }),

  http.post(url("/auth/logout"), () => new HttpResponse(null, { status: 204 })),

  http.post(url("/auth/forgot-password"), async ({ request }) => {
    const body = (await request.json()) as { identifier?: string };
    if (!body.identifier) {
      return HttpResponse.json({ code: "validation_failed" }, { status: 422 });
    }
    // Always 204: whether the account exists is not disclosed.
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(url("/auth/reset-password"), async ({ request }) => {
    const body = (await request.json()) as { token?: string; password?: string };
    if (!body.token) {
      return HttpResponse.json(
        { code: "reset_token_invalid", message: "Liên kết không còn hiệu lực" },
        { status: 410 },
      );
    }
    if (!body.password || body.password.length < 8) {
      return HttpResponse.json(
        {
          code: "validation_failed",
          fieldErrors: { password: ["Mật khẩu cần ít nhất 8 ký tự"] },
        },
        { status: 422 },
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  /**
   * Development only: the mocked identity can be switched without a rebuild by
   * setting `localStorage.setItem("soul:demo-role", "staff" | "trainer")`.
   * Real authentication is a backend concern; this exists so all three shells
   * can be opened and reviewed during design work.
   */
  http.get(url("/auth/session"), () => {
    const role =
      typeof localStorage === "undefined" ? null : localStorage.getItem("soul:demo-role");
    if (role === "staff" || role === "owner") return HttpResponse.json(DEMO_STAFF);
    if (role === "trainer") return HttpResponse.json(DEMO_TRAINER_USER);
    return HttpResponse.json(DEMO_STUDENT);
  }),

  http.get(url("/public/schedule"), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const items: PublicClassSession[] = classes
      .filter((item) => inRange(item, params.get("from"), params.get("to")))
      .map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        // See PublicClassSession.trainerName — no stand-in identity in public data.
        trainerName: null,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        availability:
          item.bookedCount >= item.capacity
            ? "full"
            : item.capacity - item.bookedCount <= 1
              ? "few_left"
              : "open",
      }));
    return HttpResponse.json({ items });
  }),

  http.get(url("/public/trainers"), () =>
    HttpResponse.json({ items: DEMO_TRAINERS.filter((t) => t.publicProfile) }),
  ),

  http.get(url("/student/classes"), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const type = params.get("type");
    const items = classes
      .filter((item) => inRange(item, params.get("from"), params.get("to")))
      .filter((item) => !type || type === "all" || item.type === type)
      .map((item) => ({ ...item, eligibility: eligibilityFor(item) }));
    return HttpResponse.json({ items });
  }),

  http.get(url("/student/classes/:classId"), ({ params }) => {
    const item = findClass(String(params.classId));
    if (!item) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({
      ...item,
      eligibility: eligibilityFor(item),
      cancellationPreview: cancellationFor(item),
    });
  }),

  http.post(url("/student/bookings"), async ({ request }) => {
    const body = (await request.json()) as { classSessionId?: string };
    const item = body.classSessionId ? findClass(body.classSessionId) : undefined;
    if (!item) return new HttpResponse(null, { status: 404 });

    const eligibility = eligibilityFor(item);
    if (!eligibility.canBook) {
      return HttpResponse.json(
        {
          code: eligibility.reasons[0] ?? "conflict",
          message: "Không thể đặt lớp này",
        },
        { status: 409 },
      );
    }

    item.bookedCount += 1;
    bookedIds.add(item.id);
    sessionsRemaining -= 1;

    const booking: Booking = {
      id: `b-${item.id}`,
      status: "booked",
      bookedAt: new Date().toISOString(),
      classSession: item,
      cancellation: cancellationFor(item),
      waitlistPosition: null,
      waitlistAutoPromote: null,
      sessionsCharged: 1,
    };
    return HttpResponse.json(booking, { status: 201 });
  }),

  /**
   * Where a student may move their own booking to.
   *
   * Same shape as the staff endpoint and the same rules — but bounded by the
   * studio's cancellation window as well: once a booking is past its deadline the
   * student cannot move it either, because moving out of a buổi they would not be
   * refunded for is the same decision as cancelling it. Staff can still act.
   */
  http.get(url("/student/bookings/:bookingId/reschedule-options"), ({ params }) => {
    const bookingId = String(params.bookingId);
    const current = classes.find((c) => `b-${c.id}` === bookingId);
    if (!current) return new HttpResponse(null, { status: 404 });
    const terms = cancellationFor(current);
    if (!terms?.cancellable) {
      return HttpResponse.json({ items: [], reason: "past_deadline" });
    }
    const items = classes
      .filter(
        (c) =>
          c.id !== current.id &&
          c.type === current.type &&
          c.status !== "cancelled" &&
          new Date(c.startsAt).getTime() > Date.now() &&
          c.bookedCount < c.capacity &&
          !bookedIds.has(c.id),
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
   * A student moving their own booking. One buổi out, one buổi in: the session
   * already charged travels with it, so this never costs a second buổi and never
   * refunds one.
   */
  http.patch(url("/student/bookings/:bookingId"), async ({ params, request }) => {
    const body = (await request.json()) as { classId?: string };
    const bookingId = String(params.bookingId);
    const current = classes.find((c) => `b-${c.id}` === bookingId);
    const target = body.classId ? findClass(body.classId) : undefined;
    if (!current || !target) return new HttpResponse(null, { status: 404 });

    const terms = cancellationFor(current);
    if (!terms?.cancellable) {
      return HttpResponse.json(
        { code: "past_deadline", message: "Đã qua hạn đổi buổi" },
        { status: 409 },
      );
    }
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

    current.bookedCount = Math.max(0, current.bookedCount - 1);
    bookedIds.delete(current.id);
    target.bookedCount += 1;
    bookedIds.add(target.id);

    const booking: Booking = {
      id: `b-${target.id}`,
      status: "booked",
      bookedAt: new Date().toISOString(),
      classSession: target,
      cancellation: cancellationFor(target),
      waitlistPosition: null,
      waitlistAutoPromote: null,
      sessionsCharged: 1,
    };
    return HttpResponse.json(booking);
  }),

  http.get(url("/student/packages"), () =>
    HttpResponse.json({ items: [{ ...DEMO_PACKAGE, sessionsRemaining }] }),
  ),

  http.get(url("/student/bookings"), () => {
    const items: Booking[] = classes
      .filter((item) => bookedIds.has(item.id))
      .map((item) => ({
        id: `b-${item.id}`,
        status: "booked" as const,
        bookedAt: new Date().toISOString(),
        classSession: item,
        cancellation: cancellationFor(item),
        waitlistPosition: null,
        waitlistAutoPromote: null,
        sessionsCharged: 1,
      }));
    return HttpResponse.json({ items });
  }),

  http.get(url("/trainer/schedule"), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const items = classes
      .filter((item) => inRange(item, params.get("from"), params.get("to")))
      .filter((item) => item.trainer.id === DEMO_TRAINERS[0]!.id);
    return HttpResponse.json({ items });
  }),

  http.get(url("/staff/calendar"), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const type = params.get("type");
    const trainerId = params.get("trainerId");
    const items = classes
      .filter((item) => inRange(item, params.get("from"), params.get("to")))
      .filter((item) => !type || type === "all" || item.type === type)
      .filter((item) => !trainerId || trainerId === "all" || item.trainer.id === trainerId);
    return HttpResponse.json({ items });
  }),

  http.get(url("/staff/trainers"), () => HttpResponse.json({ items: DEMO_TRAINERS })),

  http.post(url("/staff/classes"), async ({ request }) => {
    const body = (await request.json()) as Partial<ClassInput>;
    const fieldErrors = validateClassInput(body);
    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        { code: "validation_failed", message: "Dữ liệu chưa hợp lệ", fieldErrors },
        { status: 422 },
      );
    }

    const startsAt = studioInstant(body.date!, body.startTime!);
    const endsAt = studioInstant(body.date!, body.startTime!, body.durationMinutes!);
    const clash = trainerConflict(body.trainerId!, startsAt, endsAt);
    if (clash) return conflictResponse(clash);

    const trainer = DEMO_TRAINERS.find((t) => t.id === body.trainerId)!;
    const created: ClassSession = {
      id: `c-new-${nextClassSeq++}`,
      type: body.type === "private" ? "private" : "group",
      title: body.title!.trim(),
      trainer: { id: trainer.id, fullName: trainer.fullName, photoUrl: null },
      startsAt,
      endsAt,
      capacity: body.capacity!,
      bookedCount: 0,
      waitlistCount: 0,
      status: "scheduled",
      room: body.room?.trim() || null,
      note: body.note?.trim() || null,
      cancellationReason: null,
    };
    classes.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  /**
   * A weekly pattern. Each occurrence is checked against the trainer's calendar
   * on its own, and a clash skips that one date rather than refusing the pattern.
   * Every class created is also in `classes`, so occurrence three is checked
   * against occurrences one and two — a pattern cannot collide with itself.
   */
  http.post(url("/staff/classes/recurring"), async ({ request }) => {
    const body = (await request.json()) as Partial<RecurringClassInput>;
    const fieldErrors = validateClassInput(body);
    const weekdays = Array.isArray(body.weekdays)
      ? body.weekdays.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
      : [];
    if (weekdays.length === 0) fieldErrors.weekdays = ["Chọn ít nhất một ngày trong tuần"];
    if (!body.repeatUntil || !/^\d{4}-\d{2}-\d{2}$/.test(body.repeatUntil)) {
      fieldErrors.repeatUntil = ["Chọn ngày kết thúc lặp"];
    } else if (body.date && body.repeatUntil < body.date) {
      fieldErrors.repeatUntil = ["Ngày kết thúc phải từ ngày bắt đầu trở đi"];
    }
    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        { code: "validation_failed", message: "Dữ liệu chưa hợp lệ", fieldErrors },
        { status: 422 },
      );
    }

    const trainer = DEMO_TRAINERS.find((t) => t.id === body.trainerId)!;
    const created: ClassSession[] = [];
    const skipped: Array<{ date: string; conflict: Record<string, string> }> = [];

    for (const date of occurrences(body.date!, body.repeatUntil!, weekdays)) {
      const startsAt = studioInstant(date, body.startTime!);
      const endsAt = studioInstant(date, body.startTime!, body.durationMinutes!);
      const clash = trainerConflict(body.trainerId!, startsAt, endsAt);
      if (clash) {
        skipped.push({
          date,
          conflict: {
            classId: clash.id,
            title: clash.title,
            startsAt: clash.startsAt,
            endsAt: clash.endsAt,
            trainerName: clash.trainer.fullName,
          },
        });
        continue;
      }
      const item: ClassSession = {
        id: `c-new-${nextClassSeq++}`,
        type: body.type === "private" ? "private" : "group",
        title: body.title!.trim(),
        trainer: { id: trainer.id, fullName: trainer.fullName, photoUrl: null },
        startsAt,
        endsAt,
        capacity: body.capacity!,
        bookedCount: 0,
        waitlistCount: 0,
        status: "scheduled",
        room: body.room?.trim() || null,
        note: body.note?.trim() || null,
        cancellationReason: null,
      };
      classes.push(item);
      created.push(item);
    }

    if (created.length === 0 && skipped.length > 0) {
      // Nothing was created, so this is a refusal, not a partial success.
      return HttpResponse.json(
        {
          code: "trainer_conflict",
          message: "Mọi buổi trong mẫu lặp đều trùng lịch huấn luyện viên",
          details: skipped[0]!.conflict,
        },
        { status: 409 },
      );
    }
    return HttpResponse.json({ created, skipped }, { status: 201 });
  }),

  http.patch(url("/staff/classes/:classId"), async ({ params, request }) => {
    const body = (await request.json()) as Partial<ClassInput>;
    const item = findClass(String(params.classId));
    if (!item) return new HttpResponse(null, { status: 404 });
    if (item.status === "cancelled") {
      return HttpResponse.json(
        { code: "class_cancelled", message: "Lớp đã hủy thì không sửa được" },
        { status: 409 },
      );
    }

    const fieldErrors = validateClassInput(body, item);
    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        { code: "validation_failed", message: "Dữ liệu chưa hợp lệ", fieldErrors },
        { status: 422 },
      );
    }

    const startsAt = studioInstant(body.date!, body.startTime!);
    const endsAt = studioInstant(body.date!, body.startTime!, body.durationMinutes!);
    const clash = trainerConflict(body.trainerId!, startsAt, endsAt, item.id);
    if (clash) return conflictResponse(clash);

    const trainer = DEMO_TRAINERS.find((t) => t.id === body.trainerId)!;
    item.title = body.title!.trim();
    item.type = body.type === "private" ? "private" : "group";
    item.trainer = { id: trainer.id, fullName: trainer.fullName, photoUrl: null };
    item.startsAt = startsAt;
    item.endsAt = endsAt;
    item.capacity = body.capacity!;
    item.room = body.room?.trim() || null;
    item.note = body.note?.trim() || null;
    return HttpResponse.json(item);
  }),

  /**
   * Cancelling is its own endpoint rather than a status field on the PATCH: it is
   * not an edit, it carries a reason, and it is the one class change that cannot
   * be undone. Re-running the buổi is a new class.
   */
  http.post(url("/staff/classes/:classId/cancellation"), async ({ params, request }) => {
    const body = (await request.json()) as { reason?: string };
    const item = findClass(String(params.classId));
    if (!item) return new HttpResponse(null, { status: 404 });
    if (item.status === "cancelled") {
      return HttpResponse.json(
        { code: "already_cancelled", message: "Lớp này đã hủy" },
        { status: 409 },
      );
    }
    if (!body.reason?.trim()) {
      return HttpResponse.json(
        {
          code: "validation_failed",
          message: "Dữ liệu chưa hợp lệ",
          fieldErrors: { reason: ["Nêu lý do hủy lớp"] },
        },
        { status: 422 },
      );
    }
    item.status = "cancelled";
    item.cancellationReason = body.reason.trim();
    return HttpResponse.json(item);
  }),

  http.post(url("/public/consultations"), async ({ request }) => {
    const body = (await request.json()) as { phone?: string };
    if (!body.phone) {
      return HttpResponse.json(
        {
          code: "validation_failed",
          fieldErrors: { phone: ["Vui lòng nhập số điện thoại"] },
        },
        { status: 422 },
      );
    }
    return HttpResponse.json({ id: "lead-demo-1" }, { status: 201 });
  }),
];
