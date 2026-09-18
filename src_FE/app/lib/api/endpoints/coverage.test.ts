import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * The frontend's API surface, pinned against the backend's.
 *
 * `docs/api/README.md` is generated from the running app and pinned by
 * `src_BE/tests/test_api_docs.py`, so it cannot drift from the backend. This
 * test makes the frontend's call sites answer to the same list: add an endpoint
 * on the backend and this goes red until something here calls it, remove one
 * and it goes red until the dead call is gone.
 *
 * It reads source text rather than importing the modules because a function
 * value does not carry the URL it will request.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const API_DOCS_INDEX = join(HERE, "../../../../../docs/api/README.md");

/** `/accounts/${id}/lock` and `/accounts/{account_id}/lock` are the same route. */
function normalise(path: string): string {
  return path.replace(/\$\{[^}]*\}/g, "{}").replace(/\{[^}]*\}/g, "{}");
}

interface FrontendSurface {
  /** `"METHOD /path"` for every real request. */
  calls: Set<string>;
  /** Paths turned into a URL without a request — the `<img src>` case. */
  urls: Set<string>;
}

function endpointsDeclaredInFrontend(): FrontendSurface {
  const calls = new Set<string>();
  const urls = new Set<string>();

  const sources = readdirSync(HERE)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "index.ts")
    .map((f) => join(HERE, f));
  // `/auth/refresh` is issued by the client itself, where the single-flight
  // queue lives, so the adapter counts as a call site too.
  sources.push(join(HERE, "../client.ts"));

  for (const file of sources) {
    const source = readFileSync(file, "utf8");

    // api.get<T>("/path") · api.post(`/x/${id}`) · api.blob("/path")
    const requests = source.matchAll(
      /\bapi\.(get|post|patch|delete|blob)\s*(?:<[^()]*>)?\s*\(\s*(["'`])([^"'`]+)\2/g,
    );
    for (const match of requests) {
      const verb = match[1] ?? "";
      const path = match[3] ?? "";
      calls.add(`${verb === "blob" ? "GET" : verb.toUpperCase()} ${normalise(path)}`);
    }

    // buildUrl(...): the public trainer photo (an `<img src>`) and the refresh
    // rotation, which builds its own URL because it must bypass this adapter.
    for (const match of source.matchAll(/\bbuildUrl\s*\(\s*(["'`])([^"'`]+)\1/g)) {
      urls.add(normalise(match[2] ?? ""));
    }
  }

  return { calls, urls };
}

function endpointsInContract(): Set<string> {
  const index = readFileSync(API_DOCS_INDEX, "utf8");
  const table = index.split("<!-- muc-luc:start -->")[1]?.split("<!-- muc-luc:end -->")[0];
  expect(table, "docs/api/README.md no longer has a generated index").toBeDefined();

  const found = new Set<string>();
  for (const line of table!.split("\n")) {
    const row = /^\|\s*`(\w+)`\s*\|\s*`([^`]+)`\s*\|/.exec(line);
    if (row !== null) found.add(`${row[1]} ${normalise(row[2] ?? "")}`);
  }
  return found;
}

describe("api endpoint coverage", () => {
  const contract = endpointsInContract();
  const contractPaths = new Set([...contract].map((e) => e.split(" ")[1] ?? ""));
  const frontend = endpointsDeclaredInFrontend();

  it("reads the whole generated contract", () => {
    expect(contract.size).toBe(88);
  });

  it("calls every endpoint the backend serves", () => {
    const missing = [...contract]
      .filter((e) => !frontend.calls.has(e) && !frontend.urls.has(e.split(" ")[1] ?? ""))
      .sort();
    expect(missing, "endpoints with no binding in app/lib/api/endpoints").toEqual([]);
  });

  it("calls nothing the backend does not serve", () => {
    const extra = [
      ...[...frontend.calls].filter((e) => !contract.has(e)),
      ...[...frontend.urls].filter((p) => !contractPaths.has(p)),
    ].sort();
    expect(extra, "calls to paths outside the contract").toEqual([]);
  });
});
