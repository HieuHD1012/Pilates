import { api } from "../client";
import type {
  PaymentListParams,
  PaymentResponse,
  RecordPaymentRequest,
  VoidPaymentRequest,
} from "../schema";

/**
 * `docs/api/payments/`. A payment belongs to a `student_package_id`, not to a
 * student — the credits were already added when the package was sold, and only
 * `CONFIRMED` rows reach the revenue report.
 */
export const paymentsApi = {
  /** `GET /payments` */
  list: (params: PaymentListParams = {}) =>
    api.get<PaymentResponse[]>("/payments", { searchParams: params }),

  /** `GET /payments/{payment_id}` */
  get: (paymentId: number) => api.get<PaymentResponse>(`/payments/${paymentId}`),

  /** `POST /payments` — lands as `PENDING`. */
  create: (body: RecordPaymentRequest) => api.post<PaymentResponse>("/payments", body),

  /** `POST /payments/{id}/confirm` — the money is in hand. */
  confirm: (paymentId: number) =>
    api.post<PaymentResponse>(`/payments/${paymentId}/confirm`),

  /**
   * `POST /payments/{id}/void` — refused with 409 once the package has spent
   * credits. The error names how many, because the fix is a manual credit
   * adjustment, not a retry.
   */
  void: (paymentId: number, body: VoidPaymentRequest) =>
    api.post<PaymentResponse>(`/payments/${paymentId}/void`, body),
};
