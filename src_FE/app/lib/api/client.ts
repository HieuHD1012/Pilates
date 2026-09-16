/**
 * The only way this application talks to the backend.
 *
 * Rules encoded here (see docs/QUERY_CONVENTIONS.md):
 *  - one fetch adapter, no second HTTP client;
 *  - raw backend error text never reaches a regular user — callers render copy
 *    keyed off `ApiError.code`;
 *  - 401 is broadcast once so the session layer can react in a single place.
 */

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
  /** Backend-supplied text. For logs and staff surfaces — not for students. */
  readonly rawMessage: string | undefined;
  /** See `ApiErrorBody.details`. Narrow it against the code before reading. */
  readonly details: Record<string, unknown> | undefined;

  constructor(status: number, body: ApiErrorBody | undefined, fallback: string) {
    super(body?.message ?? fallback);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code ?? httpFallbackCode(status);
    this.fieldErrors = body?.fieldErrors ?? {};
    this.rawMessage = body?.message;
    this.details = body?.details;
  }

  get isAuth(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isValidation(): boolean {
    return this.status === 422 || this.status === 400;
  }
  /** 409 = the backend rejected a business action (full class, no sessions…). */
  get isConflict(): boolean {
    return this.status === 409;
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
  if (status >= 500) return "server_error";
  return "request_failed";
}

export const UNAUTHORIZED_EVENT = "soul:unauthorized";

function broadcastUnauthorized() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
export const API_BASE = RAW_BASE.replace(/\/$/, "") || "/api";

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Appended as a query string; nullish values are dropped. */
  searchParams?: Record<string, string | number | boolean | null | undefined>;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, searchParams, headers, ...rest } = options;

  const url = new URL(
    `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`,
    typeof window === "undefined" ? "http://localhost" : window.location.origin,
  );
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === null || value === undefined || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      credentials: "include",
      ...rest,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    // Network-level failure: no status, no body.
    throw new ApiError(0, { code: "network_error" }, "Network request failed");
  }

  if (response.status === 401) broadcastUnauthorized();

  if (!response.ok) {
    let parsed: ApiErrorBody | undefined;
    try {
      parsed = (await response.json()) as ApiErrorBody;
    } catch {
      parsed = undefined;
    }
    throw new ApiError(response.status, parsed, response.statusText);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
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
};
