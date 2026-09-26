import { Link, Outlet } from "react-router";

import { ArtDirectedImage } from "~/ui/art-directed-image";

/**
 * The threshold between the public brand and the product. It keeps the brand's
 * material — plaster, rule, display serif — but drops the editorial pacing:
 * someone signing in wants one field, then the next.
 */
export default function AuthLayout() {
  return (
    <div className="bg-sand grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col">
        <header className="gutter flex h-16 items-center">
          <Link to="/" className="flex items-baseline gap-2.5" aria-label="Về trang chủ">
            <span className="wordmark text-ink text-lg">SOUL</span>
            <span aria-hidden="true" className="bg-rule-2 h-px w-5" />
            <span className="wordmark-sub text-ink-2">Nha Trang</span>
          </Link>
        </header>

        <main className="gutter flex flex-1 items-center py-12">
          <div className="mx-auto w-full max-w-sm">
            <Outlet />
          </div>
        </main>

        <footer className="gutter text-2xs text-ink-2 py-6">
          © {new Date().getFullYear()} Soul Pilates Nha Trang
        </footer>
      </div>

      <figure className="hidden min-h-dvh overflow-hidden lg:block">
        <ArtDirectedImage photo="welcome" sizes="50vw" />
      </figure>
    </div>
  );
}
