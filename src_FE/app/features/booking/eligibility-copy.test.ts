import { describe, expect, it } from "vitest";

import { eligibilityCopy, primaryReason } from "./eligibility-copy";

/**
 * The frontend does not decide eligibility — but it must never leave a student
 * looking at a disabled button with no explanation. That is what these guard.
 */
describe("eligibility copy", () => {
  it("explains every known code", () => {
    expect(eligibilityCopy("class_full").title).toBe("Lớp đã đủ chỗ");
    expect(eligibilityCopy("no_sessions_remaining").hint).toContain("studio");
  });

  it("still produces a sentence for a code we have never seen", () => {
    const copy = eligibilityCopy("some_rule_added_next_quarter");
    expect(copy.title).toBeTruthy();
    expect(copy.title).not.toContain("some_rule");
    expect(copy.hint).toBeTruthy();
  });

  it("prefers the reason the student can act on first", () => {
    // A cancelled class outranks a full one: there is nothing to wait for.
    expect(primaryReason(["class_full", "class_cancelled"])).toBe("class_cancelled");
    // Package problems outrank capacity: fixing the package is the real step.
    expect(primaryReason(["class_full", "no_sessions_remaining"])).toBe(
      "no_sessions_remaining",
    );
  });

  it("ignores the ok sentinel", () => {
    expect(primaryReason(["ok"])).toBeNull();
  });

  it("falls back to an unmodelled code rather than returning nothing", () => {
    expect(primaryReason(["brand_new_code"])).toBe("brand_new_code");
  });
});
