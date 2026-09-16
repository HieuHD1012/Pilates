import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/client";
import type { Trainer } from "~/lib/api/types";
import { renderWithProviders } from "~/test/render";

import { ClassForm, readTrainerConflict } from "./class-form";

/**
 * The rule this form exists to enforce is CONFIRMED (Q4): one trainer per class,
 * and a reassignment must not double-book a trainer. The backend decides; what is
 * pinned here is that the refusal is explained well enough to act on, and that
 * nothing is silently dropped on the way to the backend.
 */

const TRAINERS: Trainer[] = [
  {
    id: "t-1",
    fullName: "Ngô Thanh Hà",
    headline: null,
    specialties: [],
    photoUrl: null,
    active: true,
    publicProfile: false,
  },
  {
    id: "t-2",
    fullName: "Đặng Kim Chi",
    headline: null,
    specialties: [],
    photoUrl: null,
    active: false,
    publicProfile: false,
  },
];

function conflictError() {
  return new ApiError(
    409,
    {
      code: "trainer_conflict",
      message: "trainer busy",
      details: {
        classId: "c-1",
        title: "Reformer Cơ bản",
        startsAt: "2026-08-25T06:30:00+07:00",
        endsAt: "2026-08-25T07:20:00+07:00",
        trainerName: "Ngô Thanh Hà",
      },
    },
    "fallback",
  );
}

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
  it("sends a local date, a wall-clock start and a duration, not two instants", async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText(/Tên lớp/), "Reformer Flow");
    await user.selectOptions(screen.getByLabelText(/Huấn luyện viên/), "t-1");
    await user.type(screen.getByLabelText(/^Ngày/), "2026-08-25");
    await user.type(screen.getByLabelText(/Giờ bắt đầu/), "06:30");
    await user.selectOptions(screen.getByLabelText(/Thời lượng/), "50");
    await user.type(screen.getByLabelText(/Sức chứa/), "6");
    await user.click(submit());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      title: "Reformer Flow",
      type: "group",
      trainerId: "t-1",
      date: "2026-08-25",
      startTime: "06:30",
      durationMinutes: 50,
      capacity: 6,
      room: null,
      note: null,
    });
  });

  it("shows the end time as the duration changes, because staff check it", async () => {
    const { user } = setup();

    await user.type(screen.getByLabelText(/Giờ bắt đầu/), "06:30");
    await user.selectOptions(screen.getByLabelText(/Thời lượng/), "50");
    expect(await screen.findByText(/07:20/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Thời lượng/), "90");
    expect(await screen.findByText(/08:00/)).toBeInTheDocument();
  });

  it("names the class a trainer clash collided with, not just 'trùng lịch'", () => {
    setup({ error: conflictError() });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ngô Thanh Hà đã có lớp trong khoảng giờ này.",
    );
    expect(screen.getByText("Reformer Cơ bản")).toBeInTheDocument();
    // The backend's own wording never reaches the studio.
    expect(screen.queryByText(/trainer busy/)).not.toBeInTheDocument();
  });

  it("hides an inactive trainer, unless the class already has them", () => {
    setup();
    const options = Array.from(
      (screen.getByLabelText(/Huấn luyện viên/) as HTMLSelectElement).options,
    ).map((o) => o.value);
    expect(options).not.toContain("t-2");

    renderWithProviders(
      <ClassForm
        trainers={TRAINERS}
        defaultValues={{ trainerId: "t-2" }}
        submitLabel="Lưu"
        pending={false}
        error={null}
        onCancel={() => {}}
        onSubmit={async () => {}}
      />,
    );
    const second = screen.getAllByLabelText(/Huấn luyện viên/)[1] as HTMLSelectElement;
    expect(Array.from(second.options).map((o) => o.value)).toContain("t-2");
    expect(
      Array.from(second.options).find((o) => o.value === "t-2")?.textContent,
    ).toContain("đã nghỉ");
  });

  it("refuses a duration below the studio floor", async () => {
    const { onSubmit, user } = setup({ defaultValues: { durationMinutes: "10" } });

    await user.type(screen.getByLabelText(/Tên lớp/), "Buổi thử");
    await user.selectOptions(screen.getByLabelText(/Huấn luyện viên/), "t-1");
    await user.type(screen.getByLabelText(/^Ngày/), "2026-08-25");
    await user.type(screen.getByLabelText(/Giờ bắt đầu/), "06:30");
    await user.type(screen.getByLabelText(/Sức chứa/), "6");
    await user.click(submit());

    expect(await screen.findByText(/tối thiểu 15 phút/)).toBeInTheDocument();
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

describe("readTrainerConflict", () => {
  it("ignores a malformed conflict rather than naming the wrong class", () => {
    const broken = new ApiError(
      409,
      { code: "trainer_conflict", details: { classId: "c-1" } },
      "fallback",
    );
    expect(readTrainerConflict(broken)).toBeNull();
  });

  it("ignores an error that is not a conflict", () => {
    expect(readTrainerConflict(new ApiError(500, { code: "boom" }, "x"))).toBeNull();
    expect(readTrainerConflict(new Error("nope"))).toBeNull();
  });
});
