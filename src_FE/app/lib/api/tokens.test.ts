import { beforeEach, expect, it } from "vitest";

import {
  getSessionVersion,
  getTokens,
  resetTokenCache,
  rotateSessionTokens,
  setTokens,
  subscribeTokens,
  syncTokensFromStorage,
} from "./tokens";

beforeEach(() => {
  localStorage.clear();
  resetTokenCache();
});

it("observes another tab's logout rather than keeping its old credential", () => {
  setTokens({ access: "a", refresh: "r" });
  const version = getSessionVersion();
  let latest = getTokens();
  const unsubscribe = subscribeTokens((tokens) => {
    latest = tokens;
  });
  localStorage.clear();
  window.dispatchEvent(
    new StorageEvent("storage", { key: null, storageArea: localStorage }),
  );
  expect(getTokens()).toBeNull();
  expect(latest).toBeNull();
  expect(getSessionVersion()).toBeGreaterThan(version);
  unsubscribe();
});

it("notices new credentials before the delayed storage event in a resumed tab", () => {
  setTokens({ access: "old", refresh: "old" });
  localStorage.setItem("soul:access-token", "new");
  localStorage.setItem("soul:refresh-token", "new");
  syncTokensFromStorage();
  expect(getTokens()).toEqual({ access: "new", refresh: "new" });
});

it("refuses a rotation from a previous account", () => {
  setTokens({ access: "old", refresh: "old" });
  const version = getSessionVersion();
  const next = { access: "next", refresh: "next" };
  setTokens(next);
  expect(rotateSessionTokens({ access: "late", refresh: "late" }, version)).toBe(false);
  expect(getTokens()).toEqual(next);
});
