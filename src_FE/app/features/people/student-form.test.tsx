import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/client";
import { renderWithProviders } from "~/test/render";

import { StudentForm } from "./student-form";

/**
 * The one write form shared by create, edit and lead conversion. What is pinned
 * here is the contract every other write screen will copy: the phone is the
 * identity, a duplicate is reported on the field that caused it, and the
 * backend's own error text never reaches the studio.
 */

function setup(props: Partial<Parameters<typeof StudentForm>[0]> = {}) {
  const onSubmit = vi.fn<(input: unknown) => Promise<unknown>>().mockResolvedValue({});
  renderWithProviders(
    <StudentForm
      submitLabel="Lưu"
      pending={false}
      error={null}
      onCancel={() => {}}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

const phone = () => screen.getByLabelText(/Số điện thoại/);
const name = () => screen.getByLabelText(/Họ và tên/);
const submit = () => screen.getByRole("button", { name: "Lưu" });

describe("StudentForm", () => {
  it("refuses a phone number that is not a Vietnamese mobile", async () => {
    const { onSubmit, user } = setup();

    await user.type(name(), "Nguyễn Thị Hồng Nhung");
    await user.type(phone(), "0123456789");
    await user.click(submit());

    expect(await screen.findByText(/chưa đúng định dạng/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("normalises spacing and drops empty optional fields before submitting", async () => {
    const { onSubmit, user } = setup();

    await user.type(name(), "  Trần Quốc Huy  ");
    await user.type(phone(), "090 000 00 01");
    await user.click(submit());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      fullName: "Trần Quốc Huy",
      phone: "0900000001",
      email: null,
      note: null,
    });
  });

  it("reports a duplicate phone on the phone field, not in a banner", () => {
    setup({
      error: new ApiError(
        409,
        { code: "phone_taken", message: "phone taken in db" },
        "fallback",
      ),
    });

    const message = screen.getByText("Số điện thoại này đã có hồ sơ học viên.");
    expect(message).toBeInTheDocument();
    expect(phone()).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText(/phone taken in db/)).not.toBeInTheDocument();
  });

  it("maps a 422 field error onto its own field", async () => {
    const { user } = setup({
      onSubmit: vi.fn().mockRejectedValue(
        new ApiError(
          422,
          {
            code: "validation_failed",
            message: "invalid",
            fieldErrors: { fullName: ["Họ tên trùng với hồ sơ đã khoá"] },
          },
          "fallback",
        ),
      ),
    });

    await user.type(name(), "Trần Quốc Huy");
    await user.type(phone(), "0900000001");
    await user.click(submit());

    expect(await screen.findByText("Họ tên trùng với hồ sơ đã khoá")).toBeInTheDocument();
  });

  it("prefills from a lead so staff do not retype what the studio has", () => {
    setup({ defaultValues: { fullName: "Lê Thị Mai", phone: "0912345678" } });

    expect(name()).toHaveValue("Lê Thị Mai");
    expect(phone()).toHaveValue("0912345678");
  });
});
