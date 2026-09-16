import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
} from "react-router";

import type { Route } from "./+types/root";
import { createQueryClient } from "./lib/query-client";
import { useUnauthorizedRedirect } from "./features/auth/use-unauthorized-redirect";
import { Button } from "./ui/button";
import "./styles/app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export const meta: Route.MetaFunction = () => [
  { title: "Soul Pilates Nha Trang" },
  { name: "theme-color", content: "#f2f0ea" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  // One QueryClient per browser session, created lazily so it is never shared
  // across prerender passes at build time.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionWatcher />
      <Outlet />
    </QueryClientProvider>
  );
}

function SessionWatcher() {
  const navigate = useNavigate();
  useUnauthorizedRedirect(navigate);
  return null;
}

/**
 * Shown while the SPA fallback boots on a runtime route. Deliberately almost
 * nothing: a rule and the wordmark. A skeleton of a screen we cannot yet know
 * would be a guess.
 */
export function HydrateFallback() {
  return (
    <div className="bg-sand flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span className="wordmark text-ink text-2xl">SOUL</span>
        <span className="bg-lacquer h-px w-16 origin-left animate-[rule-draw_900ms_var(--ease-measure)_infinite] motion-reduce:animate-none" />
        <span className="sr-only">Đang tải</span>
      </div>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  const title = isNotFound ? "Không tìm thấy trang" : "Đã có lỗi xảy ra";
  const description = isNotFound
    ? "Đường dẫn này không tồn tại hoặc đã được đổi. Bạn có thể quay lại trang chủ."
    : "Chúng tôi chưa tải được nội dung này. Vui lòng thử lại, hoặc quay lại trang chủ.";

  return (
    <main className="gutter mx-auto flex min-h-dvh max-w-(--container-page) flex-col justify-center">
      <p className="figures text-2xs text-ink-2">
        {isRouteErrorResponse(error) ? error.status : "500"}
      </p>
      <h1 className="font-display text-d2 text-ink mt-4 font-light">{title}</h1>
      <p className="measure text-lede text-ink-2 mt-4">{description}</p>
      <div className="mt-8">
        <Button asChild variant="secondary">
          <a href="/">Về trang chủ</a>
        </Button>
      </div>
      {import.meta.env.DEV && error instanceof Error ? (
        <pre className="rule-t text-ink-3 mt-10 max-w-full overflow-x-auto pt-4 text-xs">
          <code>{error.stack}</code>
        </pre>
      ) : null}
    </main>
  );
}
