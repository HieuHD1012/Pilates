import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, ApiError } from "./client";
import { clearTokens, getTokens, resetTokenCache, setTokens } from "./tokens";

const original = { access: "old-access", refresh: "old-refresh" };
const rotated = { access_token: "new-access", refresh_token: "new-refresh" };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const json = (body: unknown, status = 200) => Response.json(body, { status });

beforeEach(() => {
  localStorage.clear();
  resetTokenCache();
  setTokens(original);
});
afterEach(() => vi.unstubAllGlobals());

describe("authenticated request lifecycle", () => {
  it.each([503, 429])("preserves the session when refresh returns %s", async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({}, status)),
    );
    await expect(api.get("/auth/me")).rejects.toMatchObject({ status });
    expect(getTokens()).toEqual(original);
  });

  it("preserves the session when refresh loses the network", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json({}, 401))
        .mockRejectedValueOnce(new TypeError("offline")),
    );
    await expect(api.get("/auth/me")).rejects.toMatchObject({
      status: 0,
      code: "network_error",
    });
    expect(getTokens()).toEqual(original);
  });

  it("does not clear a signed-in session after rejected anonymous credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 401)));
    await expect(api.post("/auth/login", {}, { anonymous: true })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(getTokens()).toEqual(original);
  });

  it("does not resurrect a session signed out during refresh", async () => {
    const pending = deferred<Response>();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({}, 401))
      .mockReturnValueOnce(pending.promise);
    vi.stubGlobal("fetch", fetcher);
    const request = api.get("/auth/me");
    const assertion = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    clearTokens();
    pending.resolve(json(rotated));
    await assertion;
    expect(getTokens()).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not overwrite another tab's login with a late refresh response", async () => {
    const pending = deferred<Response>();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({}, 401))
      .mockReturnValueOnce(pending.promise);
    vi.stubGlobal("fetch", fetcher);
    const request = api.get("/auth/me");
    const assertion = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    localStorage.setItem("soul:access-token", "account-b");
    localStorage.setItem("soul:refresh-token", "refresh-b");
    pending.resolve(json(rotated));
    await assertion;
    expect(localStorage.getItem("soul:refresh-token")).toBe("refresh-b");
    expect(getTokens()?.access).toBe("account-b");
  });

  it("does not replay a spent token when another tab rotated while waiting for the lock", async () => {
    const waiting = deferred<void>();
    const requestLock = vi.fn(async (_name: string, work: () => Promise<void>) => {
      await waiting.promise;
      return work();
    });
    const originalNavigator = navigator;
    vi.stubGlobal("navigator", { ...originalNavigator, locks: { request: requestLock } });
    const fetcher = vi.fn().mockResolvedValue(json({}, 401));
    vi.stubGlobal("fetch", fetcher);
    const request = api.get("/auth/me");
    const assertion = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(requestLock).toHaveBeenCalledTimes(1));
    // A suspended tab can resume before its storage event is delivered.
    localStorage.setItem("soul:access-token", rotated.access_token);
    localStorage.setItem("soul:refresh-token", rotated.refresh_token);
    waiting.resolve();
    await assertion;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(getTokens()?.refresh).toBe(rotated.refresh_token);
  });

  it.each([200, 401])(
    "rejects a late %s response from a previous account",
    async (status) => {
      const pending = deferred<Response>();
      vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending.promise));
      const request = api.get("/students");
      const assertion = expect(request).rejects.toMatchObject({ name: "AbortError" });
      const other = { access: "other-account", refresh: "other-refresh" };
      setTokens(other);
      pending.resolve(json([{ id: 1 }], status));
      await assertion;
      expect(getTokens()).toEqual(other);
    },
  );

  it("shares one refresh between simultaneous expired requests", async () => {
    const pending = deferred<Response>();
    let refreshCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, options: RequestInit) => {
        if (url.endsWith("/auth/refresh")) {
          refreshCalls++;
          return pending.promise;
        }
        return Promise.resolve(
          json(
            {},
            (options.headers as Record<string, string>).Authorization ===
              "Bearer old-access"
              ? 401
              : 200,
          ),
        );
      }),
    );
    const requests = [api.get("/students"), api.get("/packages")];
    await vi.waitFor(() => expect(refreshCalls).toBe(1));
    pending.resolve(json(rotated));
    await Promise.all(requests);
    expect(refreshCalls).toBe(1);
    expect(getTokens()?.access).toBe(rotated.access_token);
  });

  it("keeps AbortError distinct from a lost connection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")),
    );
    await expect(api.get("/students")).rejects.toMatchObject({ name: "AbortError" });
  });
});
