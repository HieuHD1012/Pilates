import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_BASE, ApiError } from "~/lib/api/client";
import type { StudentResponse } from "~/lib/api/schema";
import { server } from "~/mocks/node";
import { renderWithProviders } from "~/test/render";

import { PaymentForm } from "./payment-form";

/**
 * A money form, so the pinned behaviour is about not recording the wrong number:
 * separators are accepted and normalised, an implausible amount is refused before
 * it reaches the backend, and the figure is echoed in words while it is typed.
 *
 * The other pinned fact is structural: a payment is recorded against a
 * **package**, so the package select is required and only fills once a student
 * is chosen.
 */

function student(id: number, fullName: string): StudentResponse {
  return {
    id,
    user_id: null,
    full_name: fullName,
    phone: `090000000${id}`,
    email: null,
    dob: null,
    note: null,
    status: "ACTIVE",
    created_at: "2026-01-01T09:00:00+07:00",
  };
}

const ROSTER: StudentResponse[] = [student(2, "Bùi Thị Ánh"), student(1, "Âu Dương Kiệt")];

beforeEach(() => {
  server.use(
    http.get(`${API_BASE}/packages`, () =>
      HttpResponse.json([
        {
          id: 77,
          student_id: 1,
          package_type_id: 3,
          name_snapshot: "Gói 10 buổi nhóm",
          price_snapshot: "4250000.00",
          credits_snapshot: 10,
          class_type_snapshot: "GROUP",
          start_date: "2026-09-01",
          end_date: "2026-12-01",
          status: "ACTIVE",
          balance_cached: 10,
          created_at: "2026-09-01T09:00:00+07:00",
        },
      ]),
    ),
  );
});

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
const submit = () => screen.getByRole("button", { name: "Ghi nhận" });

/** Picks the student, then waits for their packages to arrive and picks one. */
async function pickStudentAndPackage(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/Học viên/), "1");
  const packageSelect = screen.getByLabelText(/Gói tập/);
  await waitFor(() => expect(packageSelect).toBeEnabled());
  await user.selectOptions(packageSelect, "77");
}

describe("PaymentForm", () => {
  it("accepts the separators people actually type and sends whole đồng", async () => {
    const { onSubmit, user } = setup();

    await pickStudentAndPackage(user);
    await user.type(amount(), "4.250.000");
    await user.click(submit());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      student_package_id: 77,
      amount: 4250000,
      method: "TRANSFER",
      note: null,
    });
  });

  it("echoes the amount in words so a factor-of-ten typo is visible", async () => {
    const { user } = setup();
    await user.type(amount(), "42500000");
    expect(await screen.findByText(/42\.500\.000/)).toBeInTheDocument();
  });

  it("refuses an implausible amount before it reaches the backend", async () => {
    const { onSubmit, user } = setup();

    await pickStudentAndPackage(user);
    await user.type(amount(), "9000000000");
    await user.click(submit());

    expect(await screen.findByText("Số tiền vượt mức hợp lý")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("will not record money against nobody", async () => {
    const { onSubmit, user } = setup();

    await user.type(amount(), "1000000");
    await user.click(submit());

    expect(await screen.findByText("Chọn học viên")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("will not record money against no package", async () => {
    const { onSubmit, user } = setup();

    await user.selectOptions(screen.getByLabelText(/Học viên/), "1");
    await user.type(amount(), "1000000");
    await user.click(submit());

    expect(await screen.findByText("Chọn gói tập")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not ask which student when the profile already decided", () => {
    setup({ students: undefined, lockedStudent: { id: 9, fullName: "Đỗ Minh Châu" } });

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

  it("never shows the backend's own failure text for a server fault", () => {
    setup({
      error: new ApiError(500, { code: "boom", message: "db exploded" }, "fallback"),
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Chưa ghi được khoản thu");
    expect(screen.queryByText(/db exploded/)).not.toBeInTheDocument();
  });
});
