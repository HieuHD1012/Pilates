import { api } from "../client";
import { clearTokens, getSessionVersion, setTokens } from "../tokens";
import type {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  MeResponse,
  MessageResponse,
  TokenPair,
  UpdateMeRequest,
} from "../schema";

/**
 * `docs/api/auth/`.
 *
 * `refresh` is not here: rotation belongs to `client.ts`, which is the only
 * place that can guarantee one is ever in flight. Calling it from a component
 * is the mistake that revokes every session the person has.
 */
export const authApi = {
  /** `POST /auth/login` — stores the pair; everything after it is authenticated. */
  async login(body: LoginRequest): Promise<MeResponse> {
    const version = getSessionVersion();
    const pair = await api.post<TokenPair>("/auth/login", body, { anonymous: true });
    if (version !== getSessionVersion()) {
      throw new DOMException("Sign-in was superseded", "AbortError");
    }
    setTokens({ access: pair.access_token, refresh: pair.refresh_token });
    return authApi.me();
  },

  /** The backend revokes all sessions. Local sign-out takes effect immediately. */
  async logout(): Promise<void> {
    // Capture/send the old credential before clearing it; do not wait for an
    // offline server to discard private data on this device.
    const request = api.post<MessageResponse>("/auth/logout");
    clearTokens();
    try {
      await request;
    } catch (error) {
      if (!(
        error !== null &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "AbortError"
      ))
        throw error;
    }
  },

  /** `GET /auth/me` — the only source of role, `student_id` and `trainer_id`. */
  me: () => api.get<MeResponse>("/auth/me"),

  /** `PATCH /auth/me` — name and phone only; syncs the linked profile. */
  updateMe: (body: UpdateMeRequest) => api.patch<MeResponse>("/auth/me", body),

  /** `POST /auth/change-password` — the current password is required of everyone. */
  changePassword: (body: ChangePasswordRequest) =>
    api.post<MessageResponse>("/auth/change-password", body),

  /** `POST /auth/forgot-password` — answers identically whether or not the email exists. */
  forgotPassword: (body: ForgotPasswordRequest) =>
    api.post<MessageResponse>("/auth/forgot-password", body, { anonymous: true }),

  /** `POST /auth/reset-password` — the token arrives by email and is single-use. */
  resetPassword: (body: { token: string; new_password: string }) =>
    api.post<MessageResponse>("/auth/reset-password", body, { anonymous: true }),
};
