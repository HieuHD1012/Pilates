import { ArrowLeft } from "lucide-react";
import { Link, Outlet } from "react-router";

export default function AuthLayout() {
  return (
    <div className="bg-sand min-h-dvh lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <aside className="bg-ink-deep text-sand flex flex-col justify-between px-6 py-6 lg:min-h-dvh lg:px-14 lg:py-12">
        <Link
          to="/"
          aria-label="Về trang chủ"
          className="inline-flex w-fit items-baseline gap-3"
        >
          <span className="wordmark text-2xl">SOUL</span>
          <span className="text-sand text-xs">Nha Trang</span>
        </Link>
        <div className="hidden max-w-sm py-16 lg:block">
          <span className="border-amber mb-7 block w-12 border-t-2" aria-hidden="true" />
          <p className="font-display text-d2 font-light">
            Một nơi để tập.
            <br />
            <em>Một nhịp để trở về.</em>
          </p>
          <p className="text-sand mt-7 text-base">
            Lịch tập của bạn. Những buổi học sắp tới.
            <br />
            Tất cả trong một không gian riêng.
          </p>
        </div>
        <p className="text-sand hidden text-xs lg:block">Pilates reformer · Nha Trang</p>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="px-6 py-5 lg:px-10 lg:py-8">
          <Link
            to="/"
            className="text-ink-2 hover:text-copper inline-flex min-h-11 items-center gap-2 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Về website studio
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 pb-8 sm:px-8">
          <div className="bg-paper border-rule w-full max-w-lg rounded-lg border px-6 py-8 sm:px-10 sm:py-10">
            <Outlet />
          </div>
        </main>
        <footer className="text-ink-2 px-6 py-5 text-center text-xs">
          © {new Date().getFullYear()} Soul Pilates Nha Trang
        </footer>
      </div>
    </div>
  );
}
