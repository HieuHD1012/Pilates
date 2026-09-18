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

const CLASS_ID = 41;

/** `GET /classes/{id}` as a **student** receives it: no real seat count. */
function classPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: CLASS_ID,
    starts_at: "2099-08-18T06:30:00+07:00",
    ends_at: "2099-08-18T07:20:00+07:00",
    trainer_id: 7,
    class_type: "GROUP",
    capacity: 4,
    status: "SCHEDULED",
    recurrence_id: null,
    cancel_reason: null,
    booked_count: 0,
    seats_left: 1,
    trainer_name: "HLV Demo A",
    ...overrides,
  };
}

/** `bookable` is the ids `/my-schedule/bookable` answers with. */
function mockClass(payload: Record<string, unknown>, bookable: number[] = [CLASS_ID]) {
  server.use(
    http.get(`${API_BASE}/classes/:sessionId`, () => HttpResponse.json(payload)),
    http.get(`${API_BASE}/my-schedule/bookable`, () => HttpResponse.json(bookable)),
    http.get(`${API_BASE}/packages`, () =>
      HttpResponse.json([
        {
          id: 1,
          student_id: 5,
          package_type_id: 2,
          name_snapshot: "Gói Demo 10 buổi",
          price_snapshot: "3000000.00",
          credits_snapshot: 10,
          class_type_snapshot: "GROUP",
          start_date: "2026-07-01",
          end_date: "2099-09-30",
          status: "ACTIVE",
          balance_cached: 4,
          created_at: "2026-07-01T09:00:00+07:00",
        },
      ]),
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

    await screen.findByRole("heading", { name: "Lớp nhóm" });

    // The balance change is shown as 4 → 3 before anything is clicked.
    const consequence = screen.getByText("Số buổi còn lại").closest("div")!;
    await waitFor(() => expect(within(consequence).getByText("4")).toBeInTheDocument());
    expect(within(consequence).getByText("3")).toBeInTheDocument();

    // The cancellation deadline is computed per booking, so this screen says
    // where the backend's own number will appear rather than printing a policy.
    expect(screen.getByText(/Hạn hủy/)).toBeInTheDocument();
  });

  it("requires confirmation and only then books", async () => {
    const user = userEvent.setup();
    mockClass(classPayload());

    let posted = 0;
    server.use(
      http.post(`${API_BASE}/bookings`, async () => {
        posted += 1;
        return HttpResponse.json(
          {
            booking: {
              id: 900,
              class_session_id: CLASS_ID,
              student_id: 5,
              student_package_id: 1,
              status: "BOOKED",
              created_at: "2026-08-18T00:00:00+07:00",
            },
            student_package_id: 1,
            credits_remaining: 3,
          },
          { status: 201 },
        );
      }),
    );

    renderWithProviders(<ClassDetail />, {
      route: `/hv/lop-hoc/${CLASS_ID}`,
      path: "/hv/lop-hoc/:classId",
    });
    await screen.findByRole("heading", { name: "Lớp nhóm" });

    const book = await screen.findByRole("button", { name: /Đặt lớp này/ });
    await waitFor(() => expect(book).toBeEnabled());
    await user.click(book);
    expect(posted).toBe(0); // opening the dialog must not book anything

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Xác nhận đặt/ }));

    await waitFor(() => expect(posted).toBe(1));
    expect(await screen.findByText("Đã đặt")).toBeInTheDocument();
    // The action is replaced by the result, never shown beside it.
    expect(screen.queryByRole("button", { name: /Đặt lớp này/ })).not.toBeInTheDocument();
  });

  it("explains a class the student's packages cannot pay for", async () => {
    // Room in the class, but the id is absent from `/my-schedule/bookable`.
    mockClass(classPayload(), []);

    renderWithProviders(<ClassDetail />, {
      route: `/hv/lop-hoc/${CLASS_ID}`,
      path: "/hv/lop-hoc/:classId",
    });
    await screen.findByRole("heading", { name: "Lớp nhóm" });

    expect(
      await screen.findByText(/Gói tập hiện tại của bạn chưa dùng được/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đặt lớp này/ })).toBeDisabled();
  });

  it("says a full class is full", async () => {
    mockClass(classPayload({ seats_left: 0 }), []);

    renderWithProviders(<ClassDetail />, {
      route: `/hv/lop-hoc/${CLASS_ID}`,
      path: "/hv/lop-hoc/:classId",
    });
    await screen.findByRole("heading", { name: "Lớp nhóm" });

    expect(await screen.findByText("Buổi này đã hết chỗ.")).toBeInTheDocument();
    expect(screen.getByText("Hết chỗ")).toBeInTheDocument();
  });

  it("renders the backend's refusal, which is already written for the student", async () => {
    mockClass(classPayload());
    renderWithProviders(<ClassDetail />, {
      route: `/hv/lop-hoc/${CLASS_ID}`,
      path: "/hv/lop-hoc/:classId",
    });
    await screen.findByRole("heading", { name: "Lớp nhóm" });

    const user = userEvent.setup();
    server.use(
      http.post(`${API_BASE}/bookings`, () =>
        HttpResponse.json(
          { detail: { code: "SESSION_FULL", message: "Buổi lớp đã hết chỗ." } },
          { status: 409 },
        ),
      ),
    );

    const book = await screen.findByRole("button", { name: /Đặt lớp này/ });
    await waitFor(() => expect(book).toBeEnabled());
    await user.click(book);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Xác nhận đặt/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Buổi lớp đã hết chỗ.");
    // The machine-readable code is for branching, never for reading aloud.
    expect(alert).not.toHaveTextContent("SESSION_FULL");
  });

  it("recovers when the class cannot be loaded", async () => {
    server.use(
      http.get(`${API_BASE}/classes/:sessionId`, () =>
        HttpResponse.json(
          { detail: { code: "NOT_FOUND", message: "Không tìm thấy buổi lớp." } },
          { status: 404 },
        ),
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
