import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/client";
import type { StudentSummary } from "~/lib/api/types";
import { renderWithProviders } from "~/test/render";

import { PaymentForm } from "./payment-form";

/**
 * A money form, so the pinned behaviour is about not recording the wrong number:
 * separators are accepted and normalised, an implausible amount is refused before
 * it reaches the backend, and the figure is echoed in words while it is typed.
 */

const ROSTER: StudentSummary[] = [
  {
    id: "s-02",
    fullName: "Bùi Thị Ánh",
    phone: "0900000002",
    status: "active",
    currentPackageName: null,
    sessionsRemaining: null,
    expiryDate: null,
    renewalDue: false,
  },
  {
    id: "s-01",
    fullName: "Âu Dương Kiệt",
    phone: "0900000001",
    status: "active",
    currentPackageName: null,
    sessionsRemaining: null,
    expiryDate: null,
    renewalDue: false,
  },
];

function setup(props: Partial<Parameters<typeof PaymentForm>[0]> = {}) {
  const onSubmit = vi.fn<(input: unknown) => Promise<unknown>>().mockResolvedValue({});
  renderWithProviders(
    <PaymentForm
      students={ROSTER}
      pending={false}
      error={null}
      onCancel={() => {}}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

const amount = () => screen.getByLabelText(/Số tiền/);
const reference = () => screen.getByLabelText(/Nội dung/);
const submit = () => screen.getByRole("button", { name: "Ghi nhận" });

describe("PaymentForm", () => {
  it("accepts the separators people actually type and sends whole đồng", async () => {
    const { onSubmit, user } = setup();

    await user.selectOptions(screen.getByLabelText(/Học viên/), "s-01");
    await user.type(amount(), "4.250.000");
    await user.type(reference(), "Gói 10 buổi nhóm");
    await user.click(submit());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      studentId: "s-01",
      amount: 4250000,
      method: "transfer",
      status: "confirmed",
      reference: "Gói 10 buổi nhóm",
    });
  });

  it("echoes the amount in words so a factor-of-ten typo is visible", async () => {
    const { user } = setup();
    await user.type(amount(), "42500000");
    expect(await screen.findByText(/42\.500\.000/)).toBeInTheDocument();
  });

  it("refuses an implausible amount before it reaches the backend", async () => {
    const { onSubmit, user } = setup();

    await user.selectOptions(screen.getByLabelText(/Học viên/), "s-01");
    await user.type(amount(), "9000000000");
    await user.type(reference(), "Gói 10 buổi nhóm");
    await user.click(submit());

    expect(await screen.findByText("Số tiền vượt mức hợp lý")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("will not record money against nobody", async () => {
    const { onSubmit, user } = setup();

    await user.type(amount(), "1000000");
    await user.type(reference(), "Học phí lẻ");
    await user.click(submit());

    expect(await screen.findByText("Chọn học viên")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not ask which student when the profile already decided", () => {
    setup({ students: undefined, lockedStudent: { id: "s-09", fullName: "Đỗ Minh Châu" } });

    expect(screen.queryByLabelText(/Học viên/)).not.toBeInTheDocument();
    expect(screen.getByText("Đỗ Minh Châu")).toBeInTheDocument();
  });

  it("sorts the roster by Vietnamese collation, not code points", () => {
    setup();
    const options = Array.from(
      (screen.getByLabelText(/Học viên/) as HTMLSelectElement).options,
    )
      .map((o) => o.textContent)
      .filter((t) => t && !t.startsWith("—"));
    // "Âu" sorts before "Bùi" in Vietnamese; by code point it would not.
    expect(options).toEqual(["Âu Dương Kiệt", "Bùi Thị Ánh"]);
  });

  it("never shows the backend's own failure text", () => {
    setup({
      error: new ApiError(500, { code: "boom", message: "db exploded" }, "fallback"),
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Chưa ghi được khoản thu");
    expect(screen.queryByText(/db exploded/)).not.toBeInTheDocument();
  });
});
