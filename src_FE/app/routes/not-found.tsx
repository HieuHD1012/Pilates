import { Link } from "react-router";

import { Button } from "~/ui/button";

import type { Route } from "./+types/not-found";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Không tìm thấy trang — Soul Pilates Nha Trang" },
    { name: "robots", content: "noindex" },
  ];
}

export default function NotFound() {
  return (
    <main className="gutter bg-sand mx-auto flex min-h-dvh max-w-(--container-page) flex-col justify-center">
      <p className="figures text-2xs text-ink-2">404</p>
      <h1 className="font-display text-d2 text-ink mt-4 font-light">
        Không tìm thấy trang này.
      </h1>
      <p className="measure text-lede text-ink-2 mt-4">
        Đường dẫn có thể đã thay đổi. Bạn có thể quay lại trang chủ hoặc xem lịch tập.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/">Về trang chủ</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/lich-tap">Xem lịch tập</Link>
        </Button>
      </div>
    </main>
  );
}
