import { ApiError } from "~/lib/api/client";

/**
 * What to tell a student when the backend refuses.
 *
 * The backend writes its own `message` in Vietnamese **for the end user** —
 * `docs/api/README.md` says to show it and not to re-translate it from the
 * code. So that is what happens here. The local table exists for one job: to
 * add the next step where the backend's sentence states a fact but not a
 * remedy, and to produce a sentence at all when the failure has no body
 * (a network drop, a 500).
 */

/** Codes where the student can do something about it, and what that is. */
const NEXT_STEP: Record<string, string> = {
  PACKAGE_OUT_OF_CREDITS: "Liên hệ studio để mua thêm buổi.",
  PACKAGE_EXPIRED: "Studio có thể gia hạn hoặc mở gói mới cho bạn.",
  PACKAGE_NOT_ACTIVE: "Liên hệ studio để kích hoạt lại gói.",
  PACKAGE_NOT_VALID_FOR_SESSION: "Gói của bạn áp dụng cho hình thức lớp khác.",
  PACKAGE_TYPE_MISMATCH: "Gói của bạn áp dụng cho hình thức lớp khác.",
  SESSION_FULL: "Bạn có thể chọn một buổi khác trong tuần.",
  SESSION_CANCELLED: "Chọn một buổi khác giúp bạn.",
  SESSION_STARTED: "Buổi này đã bắt đầu. Vui lòng chọn buổi khác.",
  CANCELLATION_CLOSED: "Đã qua hạn hủy của lớp này.",
  ALREADY_BOOKED: "Xem lại trong “Lịch của tôi”.",
  SAME_SESSION: "Chọn một buổi khác với buổi hiện tại.",
  CONCURRENT_CONFLICT: "Vui lòng bấm lại.",
};

const GENERIC = "Chưa thực hiện được. Vui lòng thử lại sau ít phút.";

export interface RefusalCopy {
  title: string;
  hint?: string;
  /** Two people touched the same row; pressing the button again is the fix. */
  retryable: boolean;
}

export function refusalCopy(error: unknown): RefusalCopy {
  if (!(error instanceof ApiError)) {
    return { title: GENERIC, retryable: false };
  }
  if (error.status === 0) {
    return {
      title: "Mất kết nối",
      hint: "Kiểm tra mạng rồi thử lại.",
      retryable: true,
    };
  }
  return {
    title: error.rawMessage ?? GENERIC,
    hint: NEXT_STEP[error.code],
    retryable: error.isRetryableConflict,
  };
}
