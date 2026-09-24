/**
 * Where the session's two tokens live.
 *
 * `localStorage`, not memory: rule 5 in AGENTS.md says every `/hv`, `/hlv` and
 * `/studio` URL must survive a hard refresh and a pasted deep link, and a
 * session held only in a module variable does not survive either.
 *
 * Reads and writes are wrapped because storage throws outright in a locked-down
 * browser, and because this module is imported during the build-time prerender
 * pass where there is no `window` at all.
 */

const ACCESS_KEY = "soul:access-token";
const REFRESH_KEY = "soul:refresh-token";

export interface SessionTokens {
  access: string;
  refresh: string;
}

type Listener = (tokens: SessionTokens | null) => void;

const listeners = new Set<Listener>();

/**
 * Mirrors storage so a read during render never touches it. Storage is the
 * durable copy; this is the one the request path reads on every call.
 */
let cache: SessionTokens | null | undefined;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getTokens(): SessionTokens | null {
  if (cache !== undefined) return cache;

  const store = storage();
  if (store === null) {
    cache = null;
    return null;
  }
  try {
    const access = store.getItem(ACCESS_KEY);
    const refresh = store.getItem(REFRESH_KEY);
    cache = access !== null && refresh !== null ? { access, refresh } : null;
  } catch {
    cache = null;
  }
  return cache;
}

export function getAccessToken(): string | null {
  return getTokens()?.access ?? null;
}

export function setTokens(tokens: SessionTokens | null): void {
  cache = tokens;

  const store = storage();
  if (store !== null) {
    try {
      if (tokens === null) {
        store.removeItem(ACCESS_KEY);
        store.removeItem(REFRESH_KEY);
      } else {
        store.setItem(ACCESS_KEY, tokens.access);
        store.setItem(REFRESH_KEY, tokens.refresh);
      }
    } catch {
      // A browser that refuses to persist still gets a working session for as
      // long as the tab lives — the in-memory cache above is already set.
    }
  }

  for (const listener of listeners) listener(tokens);
}

export function clearTokens(): void {
  setTokens(null);
}

/** Notified on every sign-in, refresh rotation and sign-out. */
export function subscribeTokens(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test seam. Drops the mirror so the next read goes back to storage. */
export function resetTokenCache(): void {
  cache = undefined;
}
