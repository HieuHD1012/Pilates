import type { EligibilityCode } from "~/lib/api/types";

/**
 * Backend eligibility codes → Vietnamese the student can act on.
 *
 * The frontend does not decide whether someone may book; it only explains the
 * answer. An unrecognised code must still produce a sentence — a silent
 * disabled button is the worst possible outcome of a rule we did not model.
 */
const COPY: Record<EligibilityCode, { title: string; hint?: string }> = {
  ok: { title: "Bạn có thể đặt lớp này" },
  no_active_package: {
    title: "Bạn chưa có gói tập đang hoạt động",
    hint: "Liên hệ studio để được tư vấn gói phù hợp.",
  },
  package_expired: {
    title: "Gói tập của bạn đã hết hạn",
    hint: "Studio có thể gia hạn hoặc mở gói mới cho bạn.",
  },
  no_sessions_remaining: {
    title: "Gói của bạn đã hết buổi",
    hint: "Liên hệ studio để mua thêm buổi.",
  },
  class_full: {
    title: "Lớp đã đủ chỗ",
    hint: "Bạn có thể đăng ký chờ để được nhận chỗ nếu có người hủy.",
  },
  class_cancelled: { title: "Lớp này đã bị hủy" },
  already_booked: { title: "Bạn đã đăng ký lớp này" },
  booking_closed: {
    title: "Đã quá hạn đăng ký cho lớp này",
    hint: "Vui lòng chọn một buổi khác.",
  },
  package_class_type_mismatch: {
    title: "Gói hiện tại không dùng được cho hình thức lớp này",
    hint: "Gói của bạn áp dụng cho hình thức lớp khác.",
  },
  schedule_conflict: {
    title: "Bạn đã có lớp khác trùng giờ",
    hint: "Hủy lớp trùng giờ trước khi đặt buổi này.",
  },
};

const FALLBACK = {
  title: "Chưa thể đặt lớp này",
  hint: "Vui lòng liên hệ studio để được hỗ trợ.",
} as const;

export function eligibilityCopy(code: string): { title: string; hint?: string } {
  return COPY[code as EligibilityCode] ?? FALLBACK;
}

/** The single reason worth showing first when the backend returns several. */
export function primaryReason(reasons: string[]): string | null {
  const ordered = [
    "class_cancelled",
    "already_booked",
    "booking_closed",
    "schedule_conflict",
    "package_expired",
    "no_sessions_remaining",
    "no_active_package",
    "package_class_type_mismatch",
    "class_full",
  ];
  for (const code of ordered) if (reasons.includes(code)) return code;
  return reasons.find((code) => code !== "ok") ?? null;
}
