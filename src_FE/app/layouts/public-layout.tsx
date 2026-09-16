import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";

import { PUBLIC_FOOTER_NAV, PUBLIC_NAV } from "~/content/nav";
import { STUDIO } from "~/content/studio";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/button";
import { PendingFact } from "~/ui/pending-fact";

export default function PublicLayout() {
  return (
    <div className="bg-sand flex min-h-dvh flex-col">
      <a
        href="#noi-dung"
        className="sr-only-focusable bg-ink text-sand absolute top-2 left-2 z-(--z-nav) px-3 py-2 text-xs"
      >
        Bỏ qua điều hướng
      </a>
      <PublicHeader />
      <main id="noi-dung" className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}

function Wordmark({ tone = "ink" }: { tone?: "ink" | "sand" }) {
  return (
    <Link
      to="/"
      className="group flex items-baseline gap-2.5"
      aria-label="Soul Pilates Nha Trang — trang chủ"
    >
      <span className={cn("wordmark text-lg", tone === "ink" ? "text-ink" : "text-sand")}>
        SOUL
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "hidden h-px w-5 sm:block",
          tone === "ink" ? "bg-rule-2" : "bg-rule-dark",
        )}
      />
      <span
        className={cn(
          "wordmark-sub hidden sm:block",
          tone === "ink" ? "text-ink-2" : "text-sand/70",
        )}
      >
        Nha Trang
      </span>
    </Link>
  );
}

function PublicHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // P2 — one ask, stated once. The homepage hero already carries this exact
  // label at 48px; repeating it at 32px in the same viewport is one subject
  // rendered twice. Other routes keep it, because their hero CTA is below the fold.
  const heroOwnsTheAsk = location.pathname === "/";

  // Reset during render rather than in an effect: navigating away must close
  // the menu in the same commit, not one cascading render later.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="border-rule bg-sand/92 sticky top-0 z-(--z-nav) border-b backdrop-blur-[2px]">
      <div className="gutter mx-auto flex h-16 max-w-(--container-page) items-center justify-between gap-6">
        <Wordmark />

        <nav aria-label="Điều hướng chính" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {PUBLIC_NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "relative py-2 text-sm transition-colors duration-200",
                      "after:bg-lacquer after:ease-measure after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:transition-transform after:duration-200",
                      "hover:text-ink hover:after:scale-x-100",
                      isActive ? "text-ink after:scale-x-100" : "text-ink-2",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/dang-nhap">Đăng nhập</Link>
          </Button>
          {heroOwnsTheAsk ? null : (
            <Button asChild variant="lacquer" size="sm" className="hidden sm:inline-flex">
              <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
            </Button>
          )}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="menu-di-dong"
            className="text-ink -mr-2 p-2 lg:hidden"
          >
            <span className="sr-only">{open ? "Đóng menu" : "Mở menu"}</span>
            {open ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="menu-di-dong"
          className="bg-sand fixed inset-x-0 top-16 bottom-0 z-(--z-sheet) overflow-y-auto lg:hidden"
        >
          <nav aria-label="Điều hướng chính (di động)" className="gutter">
            <ul>
              {PUBLIC_NAV.map((item, index) => (
                <li key={item.to} className="border-rule border-b">
                  <NavLink to={item.to} className="flex items-baseline gap-4 py-5">
                    <span className="figures text-2xs text-ink-2">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-ink text-2xl font-light">
                      {item.label}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 py-8">
              <Button asChild variant="lacquer" size="lg" fullWidth>
                <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
              </Button>
              <Button asChild variant="secondary" size="lg" fullWidth>
                <Link to="/dang-nhap">Đăng nhập</Link>
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function PublicFooter() {
  return (
    <footer data-field="dark" className="bg-ink-deep text-sand">
      <div className="gutter mx-auto max-w-(--container-page) py-14 md:py-20">
        <div className="border-rule-dark grid gap-10 border-t pt-8 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <Wordmark tone="sand" />
            <p className="measure text-sand/70 mt-5 text-sm">
              Studio reformer tại Nha Trang. Lớp nhóm nhỏ và lớp riêng.
            </p>
          </div>

          <div className="md:col-span-4">
            <p className="label-micro text-sand/60">Liên hệ</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex gap-3">
                <dt className="text-sand/50 w-20 shrink-0">Địa chỉ</dt>
                <dd className="text-sand/85">
                  {STUDIO.address ?? <PendingFact label="Địa chỉ studio" />}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-sand/50 w-20 shrink-0">Điện thoại</dt>
                <dd className="text-sand/85">
                  {STUDIO.phone ? (
                    <a href={`tel:${STUDIO.phone.replace(/\s/g, "")}`}>{STUDIO.phone}</a>
                  ) : (
                    <PendingFact label="Số điện thoại" />
                  )}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-sand/50 w-20 shrink-0">Giờ mở cửa</dt>
                <dd className="text-sand/85">
                  {STUDIO.openingHours ?? <PendingFact label="Giờ mở cửa" />}
                </dd>
              </div>
            </dl>
          </div>

          <div className="md:col-span-4">
            <p className="label-micro text-sand/60">Trang</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {PUBLIC_FOOTER_NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-sand/85 hover:decoration-sand/50 underline decoration-transparent underline-offset-[6px] transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-rule-dark text-2xs text-sand/50 mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
          <p>© {new Date().getFullYear()} Soul Pilates Nha Trang</p>
          <p>
            <Link to="/dang-nhap" className="hover:text-sand/80">
              Dành cho học viên, huấn luyện viên và nhân viên studio
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
