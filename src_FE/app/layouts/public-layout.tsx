import { Clock, MapPin, Menu, MessageCircle, Phone, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";

import { PUBLIC_FOOTER_NAV, PUBLIC_NAV } from "~/content/nav";
import { STUDIO } from "~/content/studio";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/button";
import { PendingFact } from "~/ui/pending-fact";

/**
 * ELLA reference variant: a walnut frame (header + footer) around a cream
 * canvas of soft cards. `el-site` scopes every variant rule in
 * app/styles/ella.css, so the token layer itself is untouched.
 */
export default function PublicLayout() {
  return (
    <div className="el-site bg-sand flex min-h-dvh flex-col">
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

function Wordmark() {
  return (
    <Link
      to="/"
      className="el-wordmark group flex items-baseline gap-2.5"
      aria-label="Soul Pilates Nha Trang — trang chủ"
    >
      <span className="wordmark text-sand text-xl">SOUL</span>
      <span aria-hidden="true" className="bg-rule-dark hidden h-px w-5 sm:block" />
      <span className="wordmark-sub text-sand/75 hidden sm:block">Nha Trang</span>
    </Link>
  );
}

function PublicHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // P2 — one ask, stated once. The homepage hero carries "Đặt lịch tư vấn" in
  // the same viewport, and the consultation route is that ask. On those two
  // routes the white pill becomes the member entry instead, so the frame keeps
  // its shape without rendering one subject twice.
  const askInPage = ["/", "/dat-tu-van"].includes(location.pathname);

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
    <header data-field="dark" className="el-header sticky top-0 z-(--z-nav)">
      <div className="el-header-inner gutter mx-auto h-16 max-w-(--container-page)">
        <Wordmark />

        <nav aria-label="Điều hướng chính" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {PUBLIC_NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn("el-nav-link", isActive && "el-nav-link-active")
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center justify-end gap-5">
          {askInPage ? (
            <Link to="/dang-nhap" className="el-pill hidden sm:inline-flex">
              <UserRound aria-hidden="true" className="size-3.5" />
              Đăng nhập
            </Link>
          ) : (
            <>
              <Link to="/dang-nhap" className="el-login hidden sm:inline-flex">
                <UserRound aria-hidden="true" className="size-3.5" />
                Đăng nhập
              </Link>
              <Link to="/dat-tu-van" className="el-pill hidden sm:inline-flex">
                Đặt lịch tư vấn
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="menu-di-dong"
            className="text-sand -mr-2 p-2 lg:hidden"
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
          data-field="light"
          className="el-mobile-menu bg-sand fixed inset-x-0 top-16 bottom-0 z-(--z-sheet) overflow-y-auto lg:hidden"
        >
          <nav aria-label="Điều hướng chính (di động)" className="gutter">
            <ul className="el-mobile-menu-list">
              {PUBLIC_NAV.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className="el-mobile-menu-link">
                    <span className="font-display text-ink text-2xl">{item.label}</span>
                    <span aria-hidden="true" className="text-ink-2">
                      →
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 py-8">
              {location.pathname === "/dat-tu-van" ? null : (
                <Button asChild variant="primary" size="lg" fullWidth className="el-btn">
                  <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
                </Button>
              )}
              <Button
                asChild
                variant="secondary"
                size="lg"
                fullWidth
                className="el-btn el-btn-outline"
              >
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
    <footer data-field="dark" className="el-footer">
      <div className="gutter mx-auto max-w-(--container-page) pt-14 pb-8 md:pt-20">
        <div className="el-footer-grid">
          <div>
            <Wordmark />
            <p className="text-sand/80 mt-5 max-w-64 text-sm">
              Studio Pilates reformer tại Nha Trang. Lớp nhóm nhỏ và lớp riêng.
            </p>
          </div>

          <div>
            <p className="el-footer-label">Trang</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {PUBLIC_FOOTER_NAV.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="el-footer-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="el-footer-label">Liên hệ</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="el-footer-fact">
                <MapPin aria-hidden="true" className="size-4 shrink-0" />
                <span>
                  <span className="sr-only">Địa chỉ: </span>
                  {STUDIO.address ?? <PendingFact label="Địa chỉ studio" />}
                </span>
              </li>
              <li className="el-footer-fact">
                <Phone aria-hidden="true" className="size-4 shrink-0" />
                <span>
                  <span className="sr-only">Điện thoại: </span>
                  {STUDIO.phone ? (
                    <a href={`tel:${STUDIO.phone.replace(/\s/g, "")}`}>{STUDIO.phone}</a>
                  ) : (
                    <PendingFact label="Số điện thoại" />
                  )}
                </span>
              </li>
              <li className="el-footer-fact">
                <Clock aria-hidden="true" className="size-4 shrink-0" />
                <span>
                  <span className="sr-only">Giờ mở cửa: </span>
                  {STUDIO.openingHours ?? <PendingFact label="Giờ mở cửa" />}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <p className="el-footer-label">Kết nối</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="el-footer-fact">
                <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
                {STUDIO.zaloUrl ? (
                  <a href={STUDIO.zaloUrl} className="el-footer-link">
                    Zalo
                  </a>
                ) : (
                  <span>
                    Zalo · <PendingFact label="Liên kết Zalo" />
                  </span>
                )}
              </li>
              <li className="el-footer-fact">
                <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
                {STUDIO.instagramUrl ? (
                  <a href={STUDIO.instagramUrl} className="el-footer-link">
                    Instagram
                  </a>
                ) : (
                  <span>
                    Instagram · <PendingFact label="Instagram" />
                  </span>
                )}
              </li>
            </ul>
          </div>
        </div>

        <div className="border-rule-dark text-2xs text-sand/70 mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
          <p>© {new Date().getFullYear()} Soul Pilates Nha Trang</p>
          <p>
            <Link to="/dang-nhap" className="hover:text-sand">
              Dành cho học viên, huấn luyện viên và nhân viên studio
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
