import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "~/lib/api/client";
import { authApi } from "~/lib/api/endpoints";
import { queryKeys } from "~/lib/api/query-keys";
import {
  clearTokens,
  resetTokenCache,
  rotateSessionTokens,
  getSessionVersion,
  setTokens,
} from "~/lib/api/tokens";
import { createQueryClient } from "~/lib/query-client";
import App from "~/root";
import Login from "~/routes/auth/login";

import { RoleGate } from "./role-gate";
import { useUnauthorizedRedirect } from "./use-unauthorized-redirect";
import { useNavigate } from "react-router";
import { useSession } from "./use-session";

beforeEach(() => {
  localStorage.clear();
  resetTokenCache();
  setTokens({ access: "a", refresh: "r" });
});
afterEach(() => vi.restoreAllMocks());

function Watcher() {
  useUnauthorizedRedirect(useNavigate());
  return <p>Watch session</p>;
}

it("clears private cache at identity boundaries but keeps it on refresh", () => {
  const client = createQueryClient();
  const router = createMemoryRouter([{ path: "*", element: <Watcher /> }]);
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  const key = queryKeys.students.detail(1);
  client.setQueryData(key, { full_name: "Previous identity" });
  act(() => {
    rotateSessionTokens({ access: "rotated", refresh: "rotated" }, getSessionVersion());
  });
  expect(client.getQueryData(key)).toBeDefined();
  act(() => {
    setTokens({ access: "other", refresh: "other" });
  });
  expect(client.getQueryData(key)).toBeUndefined();
  client.setQueryData(key, { full_name: "Next identity" });
  act(() => {
    clearTokens();
  });
  expect(client.getQueryData(key)).toBeUndefined();
  client.clear();
});

it("offers retry after a transient session error instead of ejecting to login", async () => {
  const me = vi
    .spyOn(authApi, "me")
    .mockRejectedValueOnce(new ApiError(503, undefined, "Unavailable"))
    .mockResolvedValue({
      id: 1,
      email: "test@example.com",
      full_name: "Test",
      phone: null,
      role: "ADMIN",
      status: "ACTIVE",
      student_id: null,
      trainer_id: null,
    });
  const client = createQueryClient();
  const router = createMemoryRouter(
    [
      {
        path: "/studio/tong-quan",
        element: (
          <RoleGate allow={["ADMIN"]}>
            <h1>Protected</h1>
          </RoleGate>
        ),
      },
      { path: "/dang-nhap", element: <h1>Login</h1> },
    ],
    { initialEntries: ["/studio/tong-quan"] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Chưa kiểm tra được phiên");
  expect(router.state.location.pathname).toBe("/studio/tong-quan");
  await userEvent.setup().click(screen.getByRole("button", { name: "Thử lại" }));
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Protected" })).toBeVisible(),
  );
  expect(me).toHaveBeenCalledTimes(2);
  client.clear();
});

function Identity() {
  const { data } = useSession();
  return <p>{data?.full_name ?? "Loading identity"}</p>;
}

it("replaces mounted query observers when the account changes", async () => {
  const user = {
    id: 1,
    email: "a@example.com",
    full_name: "Account A",
    phone: null,
    role: "ADMIN" as const,
    status: "ACTIVE" as const,
    student_id: null,
    trainer_id: null,
  };
  vi.spyOn(authApi, "me")
    .mockResolvedValueOnce(user)
    .mockResolvedValueOnce({ ...user, id: 2, full_name: "Account B" });
  const router = createMemoryRouter(
    [
      {
        path: "/studio",
        element: <App />,
        children: [{ index: true, element: <Identity /> }],
      },
    ],
    { initialEntries: ["/studio"] },
  );
  render(<RouterProvider router={router} />);
  await screen.findByText("Account A");
  act(() => {
    setTokens({ access: "account-b", refresh: "account-b" });
  });
  await screen.findByText("Account B");
  expect(screen.queryByText("Account A")).not.toBeInTheDocument();
});

it("completes login navigation across the route remount caused by new credentials", async () => {
  clearTokens();
  const user = {
    id: 2,
    email: "student@example.com",
    full_name: "Student B",
    phone: null,
    role: "STUDENT" as const,
    status: "ACTIVE" as const,
    student_id: 2,
    trainer_id: null,
  };
  vi.spyOn(authApi, "login").mockImplementation(async () => {
    setTokens({ access: "b", refresh: "r-b" });
    return user;
  });
  vi.spyOn(authApi, "me").mockResolvedValue(user);
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <App />,
        children: [
          { path: "dang-nhap", element: <Login /> },
          {
            path: "hv/lop-hoc",
            element: (
              <RoleGate allow={["STUDENT"]}>
                <h1>Student classes</h1>
              </RoleGate>
            ),
          },
        ],
      },
    ],
    { initialEntries: ["/dang-nhap"] },
  );
  render(<RouterProvider router={router} />);
  const interaction = userEvent.setup();
  await interaction.type(screen.getByLabelText(/Email/), user.email);
  await interaction.type(screen.getByLabelText(/Mật khẩu/), "disposable-password");
  await interaction.click(screen.getByRole("button", { name: "Đăng nhập" }));
  await screen.findByRole("heading", { name: "Student classes" });
  expect(router.state.location.pathname).toBe("/hv/lop-hoc");
});
