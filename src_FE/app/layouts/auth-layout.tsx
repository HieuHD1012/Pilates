import { Link, Outlet } from "react-router";

/**
 * The threshold between the public brand and the product. It keeps the brand's
 * material — cream ground, rule, display serif — but drops the editorial
 * pacing: someone signing in wants one field, then the next. No photograph:
 * the half-screen picture this layout used to carry pushed the form off-centre
 * and told a returning student nothing (docs/adr/0005-warm-measure-palette.md).
 */
export default function AuthLayout() {
  return (
    <div className="bg-chalk flex min-h-dvh flex-col">
      <header className="border-rule border-b">
        <div className="gutter mx-auto flex h-16 max-w-(--container-page) items-center">
          <Link to="/" className="flex items-baseline gap-2.5" aria-label="Về trang chủ">
            <span className="wordmark text-ink text-lg">SOUL</span>
            <span aria-hidden="true" className="bg-rule-2 h-px w-5" />
            <span className="wordmark-sub text-ink-2">Nha Trang</span>
          </Link>
        </div>
      </header>

      <main className="gutter flex flex-1 items-center py-12 md:py-20">
        <div className="mx-auto w-full max-w-md">
          <Outlet />
        </div>
      </main>

      <footer className="gutter text-2xs text-ink-2 mx-auto w-full max-w-(--container-page) py-6">
        © {new Date().getFullYear()} Soul Pilates Nha Trang
      </footer>
    </div>
  );
}
