import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";

import { PUBLIC_FOOTER_NAV, PUBLIC_NAV } from "~/content/nav";
import { STUDIO } from "~/content/studio";
import { PendingFact } from "~/ui/pending-fact";

export default function PublicLayout() {
  return (
    <div className="os-site">
      <a className="sr-only-focusable os-skip" href="#noi-dung">
        Bỏ qua điều hướng
      </a>
      <PublicHeader />
      <main id="noi-dung">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}

function Wordmark() {
  return (
    <Link className="os-wordmark" to="/" aria-label="Soul Pilates Nha Trang — trang chủ">
      <span>SOUL</span>
      <small>Pilates · Nha Trang</small>
    </Link>
  );
}

function PublicHeader() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
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
    <header className="os-header">
      <div className="os-container os-header-inner">
        <Wordmark />
        <nav aria-label="Điều hướng chính" className="os-desktop-nav">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "is-active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="os-header-actions">
          <Link className="os-login" to="/dang-nhap">
            Đăng nhập
          </Link>
          {["/", "/dat-tu-van"].includes(location.pathname) ? null : (
            <Link className="os-pill os-pill-accent os-header-cta" to="/dat-tu-van">
              Đặt lịch tư vấn <span aria-hidden="true">↗</span>
            </Link>
          )}
          <button
            type="button"
            className="os-menu-button"
            aria-expanded={open}
            aria-controls="os-menu"
            aria-label={open ? "Đóng menu" : "Mở menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <X size={24} aria-hidden="true" />
            ) : (
              <Menu size={24} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="os-menu" className="os-mobile-nav" aria-label="Điều hướng chính (di động)">
          {PUBLIC_NAV.map((item, index) => (
            <NavLink key={item.to} to={item.to}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </NavLink>
          ))}
          <Link className="os-pill os-pill-accent" to="/dat-tu-van">
            Đặt lịch tư vấn <span aria-hidden="true">↗</span>
          </Link>
          <Link className="os-mobile-login" to="/dang-nhap">
            Đăng nhập
          </Link>
        </nav>
      ) : null}
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="os-footer" data-field="dark">
      <div className="os-container">
        <div className="os-footer-top">
          <div>
            <p className="os-footer-mark">SOUL</p>
            <p>
              Chuyển động có chủ đích.
              <br />
              Pilates tại Nha Trang.
            </p>
          </div>
          <div className="os-footer-contact">
            <h2>Liên hệ</h2>
            <dl>
              <div>
                <dt>Địa chỉ</dt>
                <dd>{STUDIO.address ?? <PendingFact label="Địa chỉ studio" />}</dd>
              </div>
              <div>
                <dt>Điện thoại</dt>
                <dd>
                  {STUDIO.phone ? (
                    <a href={`tel:${STUDIO.phone.replace(/\s/g, "")}`}>{STUDIO.phone}</a>
                  ) : (
                    <PendingFact label="Số điện thoại" />
                  )}
                </dd>
              </div>
              <div>
                <dt>Giờ mở cửa</dt>
                <dd>{STUDIO.openingHours ?? <PendingFact label="Giờ mở cửa" />}</dd>
              </div>
            </dl>
          </div>
          <nav aria-label="Điều hướng chân trang" className="os-footer-nav">
            <h2>Khám phá</h2>
            <div>
              {PUBLIC_FOOTER_NAV.map((item) => (
                <Link key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
        <div className="os-footer-bottom">
          <span>© {new Date().getFullYear()} Soul Pilates Nha Trang</span>
          <Link to="/dang-nhap">
            Dành cho học viên, huấn luyện viên và nhân viên studio
          </Link>
        </div>
      </div>
    </footer>
  );
}
