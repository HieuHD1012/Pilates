import { Menu, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";

import { PUBLIC_FOOTER_NAV, PUBLIC_NAV } from "~/content/nav";
import { STUDIO } from "~/content/studio";
import { cn } from "~/lib/cn";
import { Button } from "~/ui/button";
import { PendingFact } from "~/ui/pending-fact";

export default function PublicLayout() {
  return (
    <div className="pl-site bg-sand flex min-h-dvh flex-col">
      <a
        href="#noi-dung"
        className="sr-only-focusable bg-ink text-sand absolute top-2 left-2 z-(--z-nav) px-3 py-2 text-xs"
      >
        Bỏ qua điều hướng
      </a>
      <PublicHeader />
      <main id="noi-dung" className="pl-main flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}

/**
 * Pearl-style lock-up: a larger Latin wordmark with a small tracked sub-line
 * beneath it. Caps are permitted here only because both strings are Latin and
 * carry no diacritics (P5).
 */
function Wordmark({ tone = "ink" }: { tone?: "ink" | "sand" }) {
  return (
    <Link to="/" className="pl-wordmark" aria-label="Soul Pilates Nha Trang — trang chủ">
      <span
        aria-hidden="true"
        className={cn("pl-wordmark-main", tone === "ink" ? "text-ink" : "text-sand")}
      >
        SOUL
      </span>
      <span
        aria-hidden="true"
        className={cn("pl-wordmark-sub", tone === "ink" ? "text-ink-2" : "text-sand/70")}
      >
        PILATES · NHA TRANG
      </span>
    </Link>
  );
}

/* The header turns from transparent to frosted once the page moves. Read as an
   external store so the prerendered HTML (server snapshot: not scrolled) and
   the first client render agree. */
function subscribeScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}
const scrolledSnapshot = () => window.scrollY > 12;
const scrolledServerSnapshot = () => false;

/**
 * P2 — one ask per viewport. A page marks its own consultation action with
 * `data-page-ask`; while any such element is on screen, the header's identical
 * button stands down. Pearl repeats its booking button in the header and the
 * hero; this keeps the header button without ever showing the same ask twice.
 */
function usePageAskVisible(pathname: string) {
  const [state, setState] = useState<{ path: string; visible: boolean } | null>(null);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll("[data-page-ask]"));
    if (targets.length === 0) return;
    const onScreen = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      }
      setState({ path: pathname, visible: onScreen.size > 0 });
    });
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [pathname]);

  // Before the observer has reported for this route, assume Home's hero ask
  // is in view (it is, at load) and that other routes have none.
  if (state && state.path === pathname) return state.visible;
  return pathname === "/";
}

function PublicHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    scrolledSnapshot,
    scrolledServerSnapshot,
  );
  const pageAskVisible = usePageAskVisible(location.pathname);
  const onConsultation = location.pathname === "/dat-tu-van";
  const showHeaderAsk = !onConsultation && !pageAskVisible;

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
    <header
      data-solid={scrolled || open ? "true" : "false"}
      data-menu={open ? "true" : undefined}
      className="pl-header sticky top-0 z-(--z-nav)"
    >
      <div className="pl-header-inner gutter mx-auto flex items-center justify-between gap-6">
        <Wordmark />

        <nav aria-label="Điều hướng chính" className="pl-nav hidden xl:block">
          <ul className="flex items-center gap-8">
            {PUBLIC_NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "relative py-2 transition-colors duration-200",
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

        <div className="flex items-center gap-3">
          <Link
            to="/dang-nhap"
            className="text-ink-2 hover:text-ink hidden text-sm transition-colors xl:inline"
          >
            Đăng nhập
          </Link>
          {showHeaderAsk ? (
            <Button
              asChild
              variant="primary"
              size="sm"
              className="pl-btn pl-btn-solid fade-rise h-9 px-4 lg:h-11 lg:px-6 lg:text-sm"
            >
              <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
            </Button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="menu-di-dong"
            className="text-ink -mr-2 p-2 xl:hidden"
          >
            <span className="sr-only">{open ? "Đóng menu" : "Mở menu"}</span>
            {open ? (
              <X aria-hidden="true" className="size-6" />
            ) : (
              <Menu aria-hidden="true" className="size-6" />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="menu-di-dong"
          className="pl-menu fixed inset-x-0 bottom-0 z-(--z-sheet) overflow-y-auto xl:hidden"
        >
          <nav aria-label="Điều hướng chính (di động)" className="gutter">
            <ul className="pt-4">
              {PUBLIC_NAV.map((item, position) => (
                <li key={item.to} className="pl-menu-row">
                  <NavLink to={item.to} className="flex items-baseline gap-4 py-5">
                    <span className="figures text-2xs text-ink-2">
                      {String(position + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-ink text-2xl font-light">
                      {item.label}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 py-8">
              {onConsultation ? null : (
                <Button
                  asChild
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="pl-btn pl-btn-solid"
                >
                  <Link to="/dat-tu-van">Đặt lịch tư vấn</Link>
                </Button>
              )}
              <Button
                asChild
                variant="secondary"
                size="lg"
                fullWidth
                className="pl-btn pl-btn-outline"
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
    <footer data-field="dark" className="pl-footer text-sand">
      <div className="gutter mx-auto max-w-(--container-page) py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <Wordmark tone="sand" />
            <p className="measure text-sand/70 mt-6 text-sm">
              Studio reformer tại Nha Trang. Lớp nhóm nhỏ và lớp riêng.
            </p>
          </div>

          <div className="md:col-span-4">
            <p className="pl-ruled pl-ruled--light">Liên hệ</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex gap-3">
                <dt className="text-sand/60 w-20 shrink-0">Địa chỉ</dt>
                <dd className="text-sand/85">
                  {STUDIO.address ?? <PendingFact label="Địa chỉ studio" />}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-sand/60 w-20 shrink-0">Điện thoại</dt>
                <dd className="text-sand/85">
                  {STUDIO.phone ? (
                    <a href={`tel:${STUDIO.phone.replace(/\s/g, "")}`}>{STUDIO.phone}</a>
                  ) : (
                    <PendingFact label="Số điện thoại" />
                  )}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-sand/60 w-20 shrink-0">Giờ mở cửa</dt>
                <dd className="text-sand/85">
                  {STUDIO.openingHours ?? <PendingFact label="Giờ mở cửa" />}
                </dd>
              </div>
            </dl>
          </div>

          <div className="md:col-span-3">
            <p className="pl-ruled pl-ruled--light">Trang</p>
            <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-1">
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

        <div className="border-rule-dark text-2xs text-sand/60 mt-14 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
          <p>© {new Date().getFullYear()} Soul Pilates Nha Trang</p>
          <p>
            <Link to="/dang-nhap" className="hover:text-sand/85">
              Dành cho học viên, huấn luyện viên và nhân viên studio
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
