import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";

import { PUBLIC_FOOTER_NAV, PUBLIC_NAV } from "~/content/nav";
import { ScrollReveal } from "~/features/public/motion";
import { STUDIO } from "~/content/studio";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/button";
import { PendingFact } from "~/ui/pending-fact";
import { HoursText } from "~/ui/public-page";

export default function PublicLayout() {
  return (
    // overflow-x-clip: images may bleed to the viewport edge (`bleed-*`), and
    // 100vw includes a classic scrollbar; clipping keeps that from scrolling.
    <div className="bg-sand flex min-h-dvh flex-col overflow-x-clip">
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
      <ScrollReveal />
    </div>
  );
}

function Wordmark({ tone = "ink" }: { tone?: "ink" | "sand" }) {
  return (
    <Link
      to="/"
      className="group flex items-center gap-3"
      aria-label="J Pilates Nha Trang — trang chủ"
    >
      <span
        className={cn(
          "wordmark text-[1.375rem] font-normal",
          tone === "ink" ? "text-ink" : "text-sand",
        )}
      >
        J PILATES
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "hidden h-px w-6 sm:block",
          tone === "ink" ? "bg-rule-2" : "bg-rule-dark",
        )}
      />
      <span
        className={cn(
          "wordmark-sub hidden pt-px sm:block",
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
  // label; repeating it in the same viewport is one subject rendered twice.
  // The consultation page IS the ask, so a header link to itself is noise.
  const pageOwnsTheAsk = ["/", "/dat-tu-van", "/goi-tap", "/lien-he"].includes(
    location.pathname,
  );

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
      <div className="gutter mx-auto flex h-16 max-w-(--container-page) items-center justify-between gap-6 lg:h-20">
        <Wordmark />

        <nav aria-label="Điều hướng chính" className="hidden lg:block">
          <ul className="flex items-center gap-7 xl:gap-9">
            {PUBLIC_NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "relative py-2 text-sm transition-colors duration-200 xl:text-base",
                      "after:bg-copper-bright after:ease-measure after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:transition-transform after:duration-200",
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
          <Button asChild variant="ghost" size="sm" className="hidden xl:inline-flex">
            <Link to="/dang-nhap">Đăng nhập</Link>
          </Button>
          {pageOwnsTheAsk ? null : (
            <Button asChild variant="copper" size="md">
              <Link to="/dat-tu-van">Nhận tư vấn</Link>
            </Button>
          )}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="menu-di-dong"
            className="text-ink border-rule-2 inline-flex size-11 items-center justify-center rounded-sm border lg:hidden"
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
          // Opens in 200ms so the eye sees a layer arrive; closes at once.
          className="bg-sand fixed inset-x-0 top-16 bottom-0 z-(--z-sheet) animate-[fade-in_200ms_var(--ease-measure)] overflow-y-auto lg:top-20 lg:hidden"
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
              <Button asChild variant="copper" size="lg" fullWidth>
                <Link to="/dat-tu-van">Nhận tư vấn</Link>
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
            <Link
              to="/dat-tu-van"
              className="text-amber decoration-amber/40 hover:decoration-amber mt-5 inline-block text-sm underline underline-offset-[6px]"
            >
              Nhận tư vấn
            </Link>
          </div>

          <div className="md:col-span-4">
            <p className="label-micro text-amber">Đến studio</p>
            <dl className="mt-4 flex flex-col gap-3.5 text-sm">
              <div>
                <dt className="text-sand/60 text-xs">Địa chỉ</dt>
                <dd className="text-sand/90 mt-0.5">
                  {STUDIO.address ?? <PendingFact label="Địa chỉ studio" />}
                </dd>
              </div>
              <div>
                <dt className="text-sand/60 text-xs">Điện thoại</dt>
                <dd className="text-sand/90 mt-0.5">
                  {STUDIO.phone ? (
                    <a href={`tel:${STUDIO.phone.replace(/\s/g, "")}`}>{STUDIO.phone}</a>
                  ) : (
                    <PendingFact label="Số điện thoại" />
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sand/60 text-xs">Giờ mở cửa</dt>
                <dd className="text-sand/90 mt-0.5">
                  {STUDIO.openingHours ? (
                    <HoursText value={STUDIO.openingHours} />
                  ) : (
                    <PendingFact label="Giờ mở cửa" />
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="md:col-span-4">
            <p className="label-micro text-amber">Trang</p>
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

        <div className="border-rule-dark text-sand/55 mt-12 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t pt-6 text-xs">
          <p>© {new Date().getFullYear()} J Pilates Nha Trang</p>
          {/* One disclosure for the whole site instead of a caption under every
              frame. Remove with the last file in public/images/concept/. */}
          <p>
            Ảnh trên website là ảnh minh họa cho bản duyệt thiết kế, sẽ được thay bằng ảnh
            chụp tại studio.
          </p>
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
