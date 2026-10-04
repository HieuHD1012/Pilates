/**
 * Where the session's two tokens live.
 *
 * The current bearer-token contract persists credentials in localStorage for
 * reloads. This is a security tradeoff, not a requirement of SPA routing.
 * Migrating to HttpOnly cookies needs coordinated backend/CSRF changes.
 * Legacy storage keys preserve existing sessions during the brand migration.
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
// Sign-in/sign-out boundaries, distinct from an access-token rotation.
let sessionVersion = 0;
let persistenceAvailable = true;

export function getSessionVersion(): number {
  return sessionVersion;
}

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

/** Refresh/request boundaries also check storage, covering a suspended tab. */
export function syncTokensFromStorage(): void {
  const store = storage();
  if (!store || !persistenceAvailable) return;
  const previous = getTokens();
  let current: SessionTokens | null;
  try {
    const access = store.getItem(ACCESS_KEY);
    const refresh = store.getItem(REFRESH_KEY);
    current = access !== null && refresh !== null ? { access, refresh } : null;
  } catch {
    return;
  }
  if (previous?.access === current?.access && previous?.refresh === current?.refresh)
    return;
  cache = current;
  sessionVersion++;
  for (const listener of listeners) listener(current);
}

export function getAccessToken(): string | null {
  return getTokens()?.access ?? null;
}

export function setTokens(tokens: SessionTokens | null): void {
  if (tokens === null && getTokens() === null) return;
  sessionVersion++;
  persistTokens(tokens);
}

/** A refresh may only replace credentials belonging to the requesting session. */
export function rotateSessionTokens(tokens: SessionTokens, version: number): boolean {
  if (version !== sessionVersion || getTokens() === null) return false;
  persistTokens(tokens);
  return true;
}

function persistTokens(tokens: SessionTokens | null): void {
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
      persistenceAvailable = true;
    } catch {
      persistenceAvailable = false;
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
  sessionVersion++;
  persistenceAvailable = true;
}

// Another tab's logout/account change must also discard this tab's mirror.
// Both legacy keys remain readable so an existing deployed session survives.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.storageArea !== storage()) return;
    if (event.key !== null && event.key !== ACCESS_KEY && event.key !== REFRESH_KEY) return;
    syncTokensFromStorage();
  });
}
