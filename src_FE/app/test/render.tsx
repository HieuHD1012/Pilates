import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";

/**
 * Test helper mirroring the real provider stack: a router (routes must be able
 * to use Link/useNavigate) and a QueryClient with retries off so a failing
 * request fails once, immediately.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    route = "/",
    path = "*",
    ...options
  }: RenderOptions & {
    /** The URL to mount at. */
    route?: string;
    /** The route pattern, when the component reads `useParams()`. */
    path?: string;
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const router = createMemoryRouter([{ path, element: ui }], {
    initialEntries: [route],
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return {
    queryClient,
    ...render(<RouterProvider router={router} />, { wrapper: Wrapper, ...options }),
  };
}
