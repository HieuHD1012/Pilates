import { api } from "../client";
import type {
  AccountCreateRequest,
  AccountListParams,
  AccountResponse,
  AccountUpdateRequest,
  MessageResponse,
} from "../schema";

/** `docs/api/accounts/` — ADMIN only, every one of them. */
export const accountsApi = {
  /** `GET /accounts` */
  list: (params: AccountListParams = {}) =>
    api.get<AccountResponse[]>("/accounts", { searchParams: params }),

  /** `GET /accounts/{account_id}` */
  get: (accountId: number) => api.get<AccountResponse>(`/accounts/${accountId}`),

  /**
   * `POST /accounts` — creates the login and links the profile in one
   * transaction. A `STUDENT` needs the `student_id` of a profile that already
   * exists; omit `password` to email a set-your-own link instead.
   */
  create: (body: AccountCreateRequest) => api.post<AccountResponse>("/accounts", body),

  /** `PATCH /accounts/{account_id}` — unknown fields are refused with 422. */
  update: (accountId: number, body: AccountUpdateRequest) =>
    api.patch<AccountResponse>(`/accounts/${accountId}`, body),

  /** `POST /accounts/{id}/lock` — also revokes every open session. */
  lock: (accountId: number) => api.post<MessageResponse>(`/accounts/${accountId}/lock`),

  /** `POST /accounts/{id}/unlock` */
  unlock: (accountId: number) => api.post<MessageResponse>(`/accounts/${accountId}/unlock`),

  /** `POST /accounts/{id}/send-password-reset` — the token only ever goes by email. */
  sendPasswordReset: (accountId: number) =>
    api.post<MessageResponse>(`/accounts/${accountId}/send-password-reset`),
};
