import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test/render";

import { SessionAdjustmentForm } from "./session-adjustment-form";

/**
 * The two business rules this form exists to enforce (docs/BUSINESS_RULES.md):
 * a manual adjustment carries a reason, and nobody sets a balance directly — they
 * state a change, and the balance follows from the ledger.
 */

function setup(props: Partial<Parameters<typeof SessionAdjustmentForm>[0]> = {}) {
  const onSubmit = vi.fn<(input: unknown) => Promise<unknown>>().mockResolvedValue({});
  renderWithProviders(
    <SessionAdjustmentForm
      currentBalance={4}
      pending={false}
      error={null}
      onCancel={() => {}}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

const count = () => screen.getByLabelText(/Số buổi/);
const reason = () => screen.getByLabelText(/Lý do/);
const submit = () => screen.getByRole("button", { name: "Ghi bút toán" });

describe("SessionAdjustmentForm", () => {
  it("sends a negative delta when subtracting", async () => {
    const { onSubmit, user } = setup();

    await user.type(count(), "2");
    await user.type(reason(), "Vắng không báo trước hai buổi");
    await user.click(submit());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      delta: -2,
      reason: "Vắng không báo trước hai buổi",
    });
  });

  it("sends a positive delta when adding", async () => {
    const { onSubmit, user } = setup();

    await user.selectOptions(screen.getByLabelText(/Cộng hay trừ/), "add");
    await user.type(count(), "3");
    await user.type(reason(), "Bù ba buổi studio đóng cửa");
    await user.click(submit());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      delta: 3,
      reason: "Bù ba buổi studio đóng cửa",
    });
  });

  it("refuses an adjustment with no reason", async () => {
    const { onSubmit, user } = setup();

    await user.type(count(), "1");
    await user.click(submit());

    expect(await screen.findByText(/Nêu lý do đủ rõ/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses a fractional or zero session count", async () => {
    const { onSubmit, user } = setup();

    await user.type(count(), "1.5");
    await user.type(reason(), "Lý do đủ dài để hợp lệ");
    await user.click(submit());

    expect(await screen.findByText(/số nguyên/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the resulting balance as a preview, and flags a negative one", async () => {
    const { user } = setup({ currentBalance: 4 });

    await user.type(count(), "2");
    expect(await screen.findByText(/số dư sẽ là/)).toBeInTheDocument();
    // The change states its direction; the resulting balance does not.
    expect(screen.getByText("\u22122")).toBeInTheDocument();
    expect(screen.getByText("2", { selector: ".figures" })).toBeInTheDocument();

    await user.clear(count());
    await user.type(count(), "9");
    expect(await screen.findByText(/số dư âm/)).toBeInTheDocument();
  });

  it("shows the authoritative balance without offering to edit it", () => {
    setup({ currentBalance: 7 });

    expect(screen.getByText("Số dư hiện tại")).toBeInTheDocument();
    // No field sets a balance — the only inputs are the change and its reason.
    expect(screen.queryByLabelText(/Số dư/)).not.toBeInTheDocument();
  });
});
