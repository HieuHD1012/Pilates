import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/client";
import type { TrainerResponse } from "~/lib/api/schema";
import { renderWithProviders } from "~/test/render";

import { ClassForm } from "./class-form";

/**
 * The rule this form exists to enforce is confirmed: one trainer per class, and
 * a class must not double-book a trainer. The backend decides; what is pinned
 * here is that the refusal is explained well enough to act on, and that the
 * studio's "date + wall clock + duration" becomes the two instants the API
 * takes without anything being dropped on the way.
 */

function trainer(id: number, fullName: string, isActive: boolean): TrainerResponse {
  return {
    id,
    full_name: fullName,
    phone: null,
    bio: null,
    specialties: null,
    photo_key: null,
    is_public: false,
    is_active: isActive,
    user_id: null,
    created_at: "2026-01-01T09:00:00+07:00",
  };
}

const TRAINERS: TrainerResponse[] = [
  trainer(1, "Ngô Thanh Hà", true),
  trainer(2, "Đặng Kim Chi", false),
];

function setup(props: Partial<Parameters<typeof ClassForm>[0]> = {}) {
  const onSubmit = vi.fn<(input: unknown) => Promise<unknown>>().mockResolvedValue({});
  renderWithProviders(
    <ClassForm
      trainers={TRAINERS}
      submitLabel="Thêm lớp"
      pending={false}
      error={null}
      onCancel={() => {}}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

const submit = () => screen.getByRole("button", { name: "Thêm lớp" });

describe("ClassForm", () => {
  it("composes the two instants the API takes from the studio's own wall clock", async () => {
    const { onSubmit, user } = setup();

    await user.selectOptions(screen.getByLabelText(/Huấn luyện viên/), "1");
    await user.type(screen.getByLabelText(/^Ngày/), "2026-08-25");
    await user.type(screen.getByLabelText(/Giờ bắt đầu/), "06:30");
    await user.selectOptions(screen.getByLabelText(/Thời lượng/), "50");
    await user.type(screen.getByLabelText(/Sức chứa/), "6");
    await user.click(submit());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      starts_at: "2026-08-25T06:30:00+07:00",
      ends_at: "2026-08-25T07:20:00+07:00",
      trainer_id: 1,
      class_type: "GROUP",
      capacity: 6,
    });
  });

  it("sends the weekly pattern's own shape when it is a recurrence", async () => {
    const { onSubmit, user } = setup({ recurring: true, submitLabel: "Xem trước" });

    await user.selectOptions(screen.getByLabelText(/Huấn luyện viên/), "1");
    await user.type(screen.getByLabelText(/^Ngày/), "2026-08-25");
    await user.type(screen.getByLabelText(/Giờ bắt đầu/), "06:30");
    await user.selectOptions(screen.getByLabelText(/Thời lượng/), "50");
    await user.type(screen.getByLabelText(/Sức chứa/), "6");
    await user.click(screen.getByLabelText("Thứ ba"));
    await user.type(screen.getByLabelText(/Lặp đến ngày/), "2026-09-29");
    await user.click(screen.getByRole("button", { name: "Xem trước" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      start_date: "2026-08-25",
      end_date: "2026-09-29",
      // Monday 0 … Sunday 6, `date.weekday()`. Tuesday is 1, not 2.
      weekdays: [1],
      start_time: "06:30:00",
      duration_minutes: 50,
      trainer_id: 1,
      class_type: "GROUP",
      capacity: 6,
    });
  });

  /**
   * The bug this pins: the form used to number the days ISO-style, Monday 1 …
   * Sunday 7, while `POST /classes/recurrence` reads them with Python's
   * `date.weekday()`. Ticking "Thứ hai" produced a term of Tuesday classes, and
   * "Chủ nhật" was refused because 7 is outside the backend's range.
   */
  it("numbers the weekdays the way the backend counts them, Monday 0 to Sunday 6", async () => {
    const { onSubmit, user } = setup({ recurring: true, submitLabel: "Xem trước" });

    await user.selectOptions(screen.getByLabelText(/Huấn luyện viên/), "1");
    await user.type(screen.getByLabelText(/^Ngày/), "2026-08-25");
    await user.type(screen.getByLabelText(/Giờ bắt đầu/), "06:30");
    await user.selectOptions(screen.getByLabelText(/Thời lượng/), "50");
    await user.type(screen.getByLabelText(/Sức chứa/), "6");
    await user.click(screen.getByLabelText("Thứ hai"));
    await user.click(screen.getByLabelText("Chủ nhật"));
    await user.type(screen.getByLabelText(/Lặp đến ngày/), "2026-09-29");
    await user.click(screen.getByRole("button", { name: "Xem trước" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ weekdays: [0, 6] });
  });

  it("shows the end time as the duration changes, because staff check it", async () => {
    const { user } = setup();

    await user.type(screen.getByLabelText(/Giờ bắt đầu/), "06:30");
    await user.selectOptions(screen.getByLabelText(/Thời lượng/), "50");
    expect(await screen.findByText(/07:20/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Thời lượng/), "90");
    expect(await screen.findByText(/08:00/)).toBeInTheDocument();
  });

  it("shows the backend's own sentence for a trainer clash", () => {
    setup({
      error: new ApiError(
        409,
        {
          code: "TRAINER_DOUBLE_BOOKED",
          message: "Huấn luyện viên đã có lớp trùng giờ.",
        },
        "fallback",
      ),
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Huấn luyện viên đã có lớp trùng giờ.",
    );
    // The machine-readable code is for branching, never for reading aloud.
    expect(screen.queryByText(/TRAINER_DOUBLE_BOOKED/)).not.toBeInTheDocument();
  });

  it("hides an inactive trainer, unless the class already has them", () => {
    setup();
    const options = Array.from(
      (screen.getByLabelText(/Huấn luyện viên/) as HTMLSelectElement).options,
    ).map((o) => o.value);
    expect(options).not.toContain("2");

    renderWithProviders(
      <ClassForm
        trainers={TRAINERS}
        defaultValues={{ trainerId: "2" }}
        submitLabel="Lưu"
        pending={false}
        error={null}
        onCancel={() => {}}
        onSubmit={async () => {}}
      />,
    );
    const second = screen.getAllByLabelText(/Huấn luyện viên/)[1] as HTMLSelectElement;
    expect(Array.from(second.options).map((o) => o.value)).toContain("2");
    expect(Array.from(second.options).find((o) => o.value === "2")?.textContent).toContain(
      "đã nghỉ",
    );
  });

  it("refuses a duration below the studio floor", async () => {
    const { onSubmit, user } = setup({ defaultValues: { durationMinutes: "10" } });

    await user.selectOptions(screen.getByLabelText(/Huấn luyện viên/), "1");
    await user.type(screen.getByLabelText(/^Ngày/), "2026-08-25");
    await user.type(screen.getByLabelText(/Giờ bắt đầu/), "06:30");
    await user.type(screen.getByLabelText(/Sức chứa/), "6");
    await user.click(submit());

    expect(await screen.findByText(/tối thiểu 15 phút/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses a class that would run past midnight", async () => {
    const { onSubmit, user } = setup();

    await user.selectOptions(screen.getByLabelText(/Huấn luyện viên/), "1");
    await user.type(screen.getByLabelText(/^Ngày/), "2026-08-25");
    await user.type(screen.getByLabelText(/Giờ bắt đầu/), "23:30");
    await user.selectOptions(screen.getByLabelText(/Thời lượng/), "90");
    await user.type(screen.getByLabelText(/Sức chứa/), "6");
    await user.click(submit());

    expect(await screen.findByText("Lớp phải kết thúc trong ngày")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("states how many people are booked, so capacity is not a guess", () => {
    setup({ bookedCount: 4 });
    expect(screen.getByText("Đã có 4 người đăng ký.")).toBeInTheDocument();
  });

  it("says nothing about capacity when there is nothing to say", () => {
    // Scheduling a new class: a hint restating the label would only push the
    // control out of line with the one beside it.
    setup();
    expect(screen.queryByText(/người đăng ký/)).not.toBeInTheDocument();
  });
});
