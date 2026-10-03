import { CalendarDays, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Link, Outlet } from "react-router";

/**
 * The threshold between the public brand and the product
 * (docs/adr/0006-operational-workspace.md). One door serves three audiences,
 * so the dark half says whose door it is and what each of them does inside;
 * the light half is the form and nothing else. No photograph: it pushed the
 * form off-centre and told a returning student nothing (ADR 0005). On a phone
 * the dark half shrinks to a strip above the form.
 */
const ROLES = [
  {
    icon: CalendarDays,
    title: "Học viên",
    text: "Đặt, đổi, hủy lớp và xem số buổi còn lại.",
  },
  {
    icon: UserRoundCheck,
    title: "Huấn luyện viên",
    text: "Xem lịch dạy và điểm danh lớp của mình.",
  },
  {
    icon: ShieldCheck,
    title: "Nhân viên studio",
    text: "Quản lý lịch, khách, gói tập và thanh toán.",
  },
];

export default function AuthLayout() {
  return (
    <div className="bg-sand min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section
        data-field="dark"
        aria-label="Soul Pilates Nha Trang"
        className="bg-ink-deep text-sand relative flex flex-col justify-between gap-6 overflow-hidden px-5 py-6 lg:min-h-dvh lg:px-14 lg:py-12"
      >
        <Link
          to="/"
          className="flex items-center gap-3 self-start"
          aria-label="Về trang chủ"
        >
          <span
            aria-hidden="true"
            className="bg-copper text-sand font-display grid size-9 place-items-center rounded-md text-lg"
          >
            S
          </span>
          <span className="flex flex-col">
            <span className="wordmark text-lg">SOUL</span>
            <span className="text-sand/60 mt-1 text-xs">Pilates · Nha Trang</span>
          </span>
        </Link>

        <div className="relative z-1">
          <p className="text-amber hidden text-sm lg:block">
            Không gian làm việc của studio
          </p>
          <p className="font-display mt-0 max-w-[13em] text-[1.75rem] leading-tight font-light lg:mt-4 lg:text-[2.75rem]">
            Lịch lớp, học viên và gói tập{" "}
            <em className="text-amber font-light">ở cùng một nơi.</em>
          </p>
          <ul className="mt-10 hidden max-w-md flex-col gap-5 lg:flex">
            {ROLES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="text-sand/70 flex items-start gap-3.5 text-sm">
                <Icon className="text-amber mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  <span className="text-sand block font-medium">{title}</span>
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sand/60 hidden text-xs lg:block">
          © {new Date().getFullYear()} Soul Pilates Nha Trang
        </p>

        {/* One hairline circle: the reformer's spring, drawn once. */}
        <span
          aria-hidden="true"
          className="border-rule-dark pointer-events-none absolute -right-40 -bottom-40 hidden size-105 rounded-full border lg:block"
        />
      </section>

      <main className="flex items-start justify-center px-5 py-8 sm:py-12 lg:items-center lg:px-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
