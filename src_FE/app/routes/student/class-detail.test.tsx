import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { API_BASE } from "~/lib/api/client";
import { server } from "~/mocks/node";
import { renderWithProviders } from "~/test/render";

import ClassDetail from "./class-detail";

/**
 * REFERENCE C behaviour, pinned.
 *
 * These are the rules every future mutation screen inherits, so they are worth
 * testing at the behaviour level rather than at the markup level.
 */

const CLASS_ID = "c-test-1";

function classPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: CLASS_ID,
    type: "group",
    title: "Reformer Flow",
    trainer: { id: "t-1", fullName: "HLV Demo A", photoUrl: null },
    startsAt: "2099-08-18T06:30:00+07:00",
    endsAt: "2099-08-18T07:20:00+07:00",
    capacity: 4,
    bookedCount: 2,
    waitlistCount: 0,
    status: "scheduled",
    room: null,
    note: null,
    eligibility: {
      canBook: true,
      canJoinWaitlist: false,
      reasons: ["ok"],
      sessionCost: 1,
    },
    cancellationPreview: {
      cancellable: true,
      refundable: true,
      deadlineAt: "2099-08-18T02:30:00+07:00",
      policyHours: 4,
    },
    ...overrides,
  };
}

function mockClass(payload: Record<string, unknown>) {
  server.use(
    http.get(`${API_BASE}/student/classes/:classId`, () => HttpResponse.json(payload)),
    http.get(`${API_BASE}/student/packages`, () =>
      HttpResponse.json({
        items: [
          {
            id: "sp-1",
            packageName: "Gói Demo 10 buổi",
            allowedClassTypes: ["group"],
            sessionsTotal: 10,
            sessionsRemaining: 4,
            startDate: "2026-07-01",
            expiryDate: "2099-09-30",
            status: "active",
            renewalDue: false,
          },
        ],
      }),
    ),
  );
}

describe("student class booking", () => {
  it("states the transaction's consequence before the student commits", async () => {
    mockClass(classPayload());
    renderWithProviders(<ClassDetail />, {
      route: `/hv/lop-hoc/${CLASS_ID}`,
      path: "/hv/lop-hoc/:classId",
    });

    await screen.findByRole("heading", { name: "Reformer Flow" });

    // The balance change is shown as 4 → 3 before anything is clicked.
    const consequence = screen.getByText("Số buổi còn lại").closest("div")!;
    expect(within(consequence).getByText("4")).toBeInTheDocument();
    expect(within(consequence).getByText("3")).toBeInTheDocument();

    // And the refund deadline, in the backend's own numbers.
    expect(screen.getByText(/Hủy được hoàn buổi/)).toBeInTheDocument();
  });

  it("requires confirmation and only then books", async () => {
    const user = userEvent.setup();
    mockClass(classPayload());

    let posted = 0;
    server.use(
      http.post(`${API_BASE}/student/bookings`, async () => {
        posted += 1;
        return HttpResponse.json(
          {
            id: "b-1",
            status: "booked",
            bookedAt: "2026-08-18T00:00:00+07:00",
            classSession: classPayload(),
            cancellation: null,
            waitlistPosition: null,
            waitlistAutoPromote: null,
            sessionsCharged: 1,
          },
          { status: 201 },
        );
      }),
    );

    renderWithProviders(<ClassDetail />, {
      route: `/hv/lop-hoc/${CLASS_ID}`,
      path: "/hv/lop-hoc/:classId",
    });
    await screen.findByRole("heading", { name: "Reformer Flow" });

    await user.click(screen.getByRole("button", { name: /Đặt lớp này/ }));
    expect(posted).toBe(0); // opening the dialog must not book anything

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Xác nhận đặt/ }));

    await waitFor(() => expect(posted).toBe(1));
    expect(await screen.findByText("Đã đặt")).toBeInTheDocument();
    // The action is replaced by the result, never shown beside it.
    expect(screen.queryByRole("button", { name: /Đặt lớp này/ })).not.toBeInTheDocument();
  });

  it("renders a backend refusal as a sentence the student can act on", async () => {
    mockClass(
      classPayload({
        bookedCount: 4,
        eligibility: {
          canBook: false,
          canJoinWaitlist: true,
          reasons: ["class_full"],
          sessionCost: null,
        },
      }),
    );

    renderWithProviders(<ClassDetail />, {
      route: `/hv/lop-hoc/${CLASS_ID}`,
      path: "/hv/lop-hoc/:classId",
    });
    await screen.findByRole("heading", { name: "Reformer Flow" });

    expect(screen.getByText("Lớp đã đủ chỗ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đặt lớp này/ })).toBeDisabled();
  });

  it("shows a contextual error instead of the backend's own words", async () => {
    mockClass(classPayload());
    renderWithProviders(<ClassDetail />, {
      route: `/hv/lop-hoc/${CLASS_ID}`,
      path: "/hv/lop-hoc/:classId",
    });
    await screen.findByRole("heading", { name: "Reformer Flow" });

    const user = userEvent.setup();
    server.use(
      http.post(`${API_BASE}/student/bookings`, () =>
        HttpResponse.json(
          { code: "class_full", message: "SQL constraint violation on seat_lock" },
          { status: 409 },
        ),
      ),
    );

    await user.click(screen.getByRole("button", { name: /Đặt lớp này/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Xác nhận đặt/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Lớp đã đủ chỗ");
    expect(alert).not.toHaveTextContent("SQL");
  });

  it("recovers when the class cannot be loaded", async () => {
    server.use(
      http.get(`${API_BASE}/student/classes/:classId`, () =>
        HttpResponse.json({ code: "not_found" }, { status: 404 }),
      ),
    );

    renderWithProviders(<ClassDetail />, {
      route: `/hv/lop-hoc/${CLASS_ID}`,
      path: "/hv/lop-hoc/:classId",
    });
    expect(await screen.findByText("Không mở được lớp này")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Quay lại danh sách lớp/ }),
    ).toBeInTheDocument();
  });
});
