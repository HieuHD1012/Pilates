/**
 * The only way this application talks to the backend.
 *
 * Rules encoded here (see docs/QUERY_CONVENTIONS.md and docs/API_MAPPING.md):
 *  - one fetch adapter, no second HTTP client;
 *  - every authenticated call carries `Authorization: Bearer <access_token>`;
 *  - **one `/auth/refresh` per session in this tab.** The backend rotates the
 *    refresh token with a ten-second grace window and treats a spent token
 *    presented after it as theft — it then revokes every session that person
 *    has. Two parallel 401s each calling refresh is exactly that shape, so 401s
 *    queue behind one shared promise instead;
 *  - Web Locks serialize rotation across tabs when supported; persisted token
 *    changes are checked before rotation. Other browsers use the backend grace;
 *  - structured backend messages are rendered by the shared error copy helper;
 *  - rejected refresh credentials end the session once; transient outages keep
 *    the credentials so the user can retry.
 */

import {
  clearTokens,
  getSessionVersion,
  getTokens,
  rotateSessionTokens,
  syncTokensFromStorage,
} from "./tokens";
import type { ApiErrorDetail, TokenPair } from "./schema";

export interface ApiErrorBody {
  code?: string;
  message?: string;
  /** Field-level validation errors, keyed by form field name. */
  fieldErrors?: Record<string, string[]>;
  /**
   * Structured context for a rejection a form has to explain rather than just
   * report — the class a trainer is already teaching, for instance. Unknown to
   * the client until a caller narrows it.
   */
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string[]>;
  /** Backend-supplied text. Written for end users, in Vietnamese. */
  readonly rawMessage: string | undefined;
  /** See `ApiErrorBody.details`. Narrow it against the code before reading. */
  readonly details: Record<string, unknown> | undefined;
  /** Seconds from the `Retry-After` header on a 429. */
  readonly retryAfter: number | undefined;

  constructor(
    status: number,
    body: ApiErrorBody | undefined,
    fallback: string,
    retryAfter?: number,
  ) {
    super(body?.message ?? fallback);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code ?? httpFallbackCode(status);
    this.fieldErrors = body?.fieldErrors ?? {};
    this.rawMessage = body?.message;
    this.details = body?.details;
    this.retryAfter = retryAfter;
  }

  get isAuth(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isValidation(): boolean {
    return this.status === 422 || this.status === 400;
  }
  /** 409 = the backend rejected a business action (full class, no credits…). */
  get isConflict(): boolean {
    return this.status === 409;
  }
  get isRateLimited(): boolean {
    return this.status === 429;
  }
  /**
   * Two people touched the same row. The backend says so, and says it is worth
   * trying again — offer the button back rather than a red error.
   */
  get isRetryableConflict(): boolean {
    return this.status === 409 && this.code === "CONCURRENT_CONFLICT";
  }
  get isServer(): boolean {
    return this.status >= 500;
  }
}

function httpFallbackCode(status: number): string {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation_failed";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "request_failed";
}

/**
 * The backend's own sentence, or a fallback.
 *
 * `docs/api/README.md`: `message` is written in Vietnamese **for the end user**
 * — show it rather than re-deriving copy from `code`. A refusal with no body
 * (a network drop, a 500) has nothing to show, which is what the fallback is
 * for. `code` stays for branching, never for reading aloud.
 */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? (error.rawMessage ?? fallback) : fallback;
}

export const UNAUTHORIZED_EVENT = "soul:unauthorized";

function broadcastUnauthorized() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
export const API_BASE = RAW_BASE.replace(/\/$/, "") || "/api";

export type QueryValue = string | number | boolean | null | undefined;
export type SearchParams = Record<string, QueryValue | QueryValue[]>;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** Serialised as JSON. Pass a `FormData` to send multipart instead. */
  body?: unknown;
  /** Appended as a query string; nullish and empty values are dropped. */
  searchParams?: SearchParams;
  /** `blob` for the binary endpoints — photos and report exports. */
  responseType?: "json" | "blob";
  /** Skips both the Authorization header and the refresh-and-retry path. */
  anonymous?: boolean;
}

/** Endpoints where a 401 is the answer, not a stale token. */
const NO_REFRESH_PATHS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
];

export function buildUrl(path: string, searchParams?: SearchParams): string {
  const url = new URL(
    `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`,
    typeof window === "undefined" ? "http://localhost" : window.location.origin,
  );
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        if (item === null || item === undefined || item === "") continue;
        url.searchParams.append(key, String(item));
      }
    }
  }
  return url.toString();
}

/**
 * The shared refresh. While this is non-null every other 401 waits on it
 * instead of starting a second rotation.
 */
let inFlightRefresh: { version: number; promise: Promise<void> } | null = null;

function assertSession(version: number): void {
  // Check persisted credentials even if a suspended tab has not received its
  // storage event yet. A late response must not overwrite another tab's login.
  syncTokensFromStorage();
  if (version !== getSessionVersion()) {
    throw new DOMException("The requesting session has ended", "AbortError");
  }
}

function networkError(error: unknown): Error {
  if (
    error !== null &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "AbortError"
  )
    return error as Error;
  return new ApiError(0, { code: "network_error" }, "Network request failed");
}

async function rotateTokens(version: number): Promise<void> {
  syncTokensFromStorage();
  assertSession(version);
  const current = getTokens();
  if (current === null) return;

  let response: Response;
  try {
    response = await fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: current.refresh }),
    });
  } catch (error) {
    assertSession(version);
    throw networkError(error);
  }
  assertSession(version);
  if (!response.ok) {
    const error = new ApiError(
      response.status,
      await parseErrorBody(response),
      response.statusText,
      retryAfterSeconds(response),
    );
    assertSession(version);
    // Only a definitive authentication rejection ends the session. A 5xx,
    // rate limit or offline refresh is recoverable without signing in again.
    if (response.status === 401) {
      clearTokens();
      broadcastUnauthorized();
    }
    throw error;
  }
  const pair = (await response.json()) as TokenPair;
  assertSession(version);
  if (
    !rotateSessionTokens(
      { access: pair.access_token, refresh: pair.refresh_token },
      version,
    )
  ) {
    throw new DOMException("The requesting session has ended", "AbortError");
  }
}

function refreshSession(version: number): Promise<void> {
  if (inFlightRefresh?.version === version) return inFlightRefresh.promise;
  // HTTPS browsers coordinate rotations across tabs. The storage check inside
  // the lock prevents a resumed tab from replaying a token already spent by
  // another tab; unsupported browsers retain the server grace-window fallback.
  const rotation =
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request("j-pilates:refresh", () => rotateTokens(version))
      : rotateTokens(version);
  const promise = rotation.finally(() => {
    if (inFlightRefresh?.promise === promise) inFlightRefresh = null;
  });
  inFlightRefresh = { version, promise };
  return promise;
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody | undefined> {
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return undefined;
  }

  const detail = (parsed as { detail?: unknown } | null)?.detail;

  // FastAPI's own validation shape: an array of {loc, msg, type}. That is a
  // *format* error, so it belongs against the input that caused it.
  if (Array.isArray(detail)) {
    const fieldErrors: Record<string, string[]> = {};
    for (const item of detail as Array<{ loc?: unknown[]; msg?: string }>) {
      const loc = Array.isArray(item.loc) ? item.loc : [];
      const field = [...loc].reverse().find((part) => typeof part === "string");
      const key = typeof field === "string" && field !== "body" ? field : "_";
      (fieldErrors[key] ??= []).push(item.msg ?? "Giá trị không hợp lệ.");
    }
    return { code: "validation_failed", fieldErrors };
  }

  if (detail !== null && typeof detail === "object") {
    const business = detail as Partial<ApiErrorDetail> & Record<string, unknown>;
    const { code, message, ...rest } = business;
    return {
      code: typeof code === "string" ? code : undefined,
      message: typeof message === "string" ? message : undefined,
      details: Object.keys(rest).length > 0 ? rest : undefined,
    };
  }

  if (typeof detail === "string") return { message: detail };
  return undefined;
}

function retryAfterSeconds(response: Response): number | undefined {
  const header = response.headers.get("Retry-After");
  if (header === null) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds : undefined;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const { body, searchParams, headers, anonymous, responseType, ...rest } = options;
  void responseType;

  const isForm = body instanceof FormData;
  const token = anonymous === true ? null : (getTokens()?.access ?? null);

  return fetch(buildUrl(path, searchParams), {
    ...rest,
    headers: {
      Accept: "application/json",
      // FormData sets its own boundary; naming a type here corrupts the body.
      ...(body === undefined || isForm ? {} : { "Content-Type": "application/json" }),
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    ...(body === undefined
      ? {}
      : { body: isForm ? body : (JSON.stringify(body) as BodyInit) }),
  });
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  syncTokensFromStorage();
  const version = getSessionVersion();
  const credential = options.anonymous === true ? null : getTokens()?.access;
  const checkSession = () => {
    options.signal?.throwIfAborted();
    if (options.anonymous !== true) assertSession(version);
  };
  let response: Response;
  try {
    response = await send(path, options);
  } catch (error) {
    checkSession();
    throw networkError(error);
  }
  checkSession();

  const refreshable =
    options.anonymous !== true && !NO_REFRESH_PATHS.some((p) => path.startsWith(p));

  if (response.status === 401 && refreshable && getTokens() !== null) {
    // A different request may already have rotated this access token.
    if (credential === getTokens()?.access) await refreshSession(version);
    checkSession();
    try {
      response = await send(path, options);
    } catch (error) {
      checkSession();
      throw networkError(error);
    }
    checkSession();
  }

  if (response.status === 401 && options.anonymous !== true) {
    clearTokens();
    broadcastUnauthorized();
  }

  if (!response.ok) {
    const body = await parseErrorBody(response);
    if (response.status !== 401) checkSession();
    throw new ApiError(
      response.status,
      body,
      response.statusText,
      retryAfterSeconds(response),
    );
  }

  if (response.status === 204) return undefined as T;
  const result =
    options.responseType === "blob" ? await response.blob() : await response.json();
  checkSession();
  return result as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
  /** Binary reads: trainer photos, progress photos, report exports. */
  blob: (path: string, options?: RequestOptions) =>
    apiFetch<Blob>(path, { ...options, method: "GET", responseType: "blob" }),
};
