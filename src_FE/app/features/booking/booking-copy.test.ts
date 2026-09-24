import { describe, expect, it } from "vitest";

import { ApiError } from "~/lib/api/client";

import { refusalCopy } from "./booking-copy";

/**
 * The frontend does not decide eligibility — but it must never leave a student
 * looking at a disabled button with no explanation. That is what these guard.
 */
describe("refusal copy", () => {
  it("shows the backend's own sentence", () => {
    const copy = refusalCopy(
      new ApiError(409, { code: "SESSION_FULL", message: "Buổi lớp đã hết chỗ." }, "x"),
    );
    expect(copy.title).toBe("Buổi lớp đã hết chỗ.");
    expect(copy.hint).toContain("buổi khác");
  });

  it("still produces a sentence for a code we have never seen", () => {
    const copy = refusalCopy(
      new ApiError(409, { code: "RULE_ADDED_NEXT_QUARTER", message: "Không thể." }, "x"),
    );
    expect(copy.title).toBe("Không thể.");
    expect(copy.title).not.toContain("RULE_ADDED");
  });

  it("never shows a bare code when the body is missing", () => {
    const copy = refusalCopy(new ApiError(500, undefined, "Server Error"));
    expect(copy.title).not.toContain("server_error");
    expect(copy.title).toBeTruthy();
  });

  it("marks a concurrent conflict as worth pressing again", () => {
    const copy = refusalCopy(
      new ApiError(409, { code: "CONCURRENT_CONFLICT", message: "Thử lại." }, "x"),
    );
    expect(copy.retryable).toBe(true);
  });

  it("treats a network drop as its own answer", () => {
    expect(refusalCopy(new ApiError(0, { code: "network_error" }, "x")).retryable).toBe(
      true,
    );
  });
});
